import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  Plane, Wallet, TrendingUp, Eye, EyeOff, Plus, Trash2, CalendarClock, X, Award,
  LayoutDashboard, Users, Layers, PlaneTakeoff, CreditCard, User, CalendarCheck,
  Gift, ShoppingCart, BadgePercent, ArrowLeftRight, DollarSign, Ticket, ShieldCheck,
  Pencil, ChevronDown, ArrowLeft, KeyRound, Menu, MapPin, Hotel
} from "lucide-react";

const TIPOS_PROGRAMA = ["Aéreo", "Cartão", "Hotel"];
const MARCAS_POR_TIPO = {
  "Aéreo": ["Azul", "Latam", "Ibéria", "Smiles", "Tap", "Outro"],
  "Cartão": ["Átomos", "Caixa", "Coopera", "Curtaí", "Esfera", "Itaú", "Livelo", "Loop", "Outro"],
  "Hotel": ["All Accor", "Outro"],
};
// Contas criadas antes dessa estrutura não têm "tipo" salvo — infere pela marca pra não quebrar os totais.
const CARTAO_MARCAS = ["átomos", "atomos", "caixa", "coopera", "curtaí", "curtai", "esfera", "itaú", "itau", "livelo", "loop"];
const HOTEL_MARCAS = ["accor"];
function inferTipo(a) {
  if (a.tipo) return a.tipo;
  const nome = (a.programa || "").toLowerCase();
  if (HOTEL_MARCAS.some((m) => nome.includes(m))) return "Hotel";
  if (CARTAO_MARCAS.some((m) => nome.includes(m))) return "Cartão";
  return "Aéreo";
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const onlyDigits = (s) => (s || "").replace(/\D/g, "");
const formatBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatNegativeBRL = (v) => `- ${formatBRL(Math.abs(Number(v) || 0))}`;
const formatDate = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const maskCpf = (cpf) => { if (!cpf) return "—"; const d = onlyDigits(cpf); if (d.length < 11) return cpf; return `***.${d.slice(3, 6)}.***-${d.slice(9, 11)}`; };

const PROGRAM_COLORS = {
  smiles: "#FF7A00", "latam pass": "#7B2D8E", latam: "#7B2D8E", tudoazul: "#0039A6", azul: "#0039A6",
  livelo: "#E4007C", esfera: "#6B7280", accor: "#151515", iberia: "#C6007E", ibéria: "#C6007E",
  tap: "#CE0E2D", átomos: "#7A3FF2", atomos: "#7A3FF2", caixa: "#0055A4", coopera: "#00A651",
  curtaí: "#FF5A00", curtai: "#FF5A00", itaú: "#EC7000", itau: "#EC7000",
};
function colorForPrograma(nome) {
  const key = (nome || "").toLowerCase();
  for (const k in PROGRAM_COLORS) if (key.includes(k)) return PROGRAM_COLORS[k];
  return "#2E6FF2";
}

// Valor de mercado estimado por milheiro, usado exclusivamente no card "Patrimônio Estimado".
const VALOR_MILHEIRO_PATRIMONIO = {
  azul: 20,
  latam: 30,
  livelo: 40,
  atomos: 50,
  esfera: 40,
  iberia: 75,
  smiles: 20,
  tap: 50,
  "all accor": 100,
  accor: 100,
  caixa: 40,
  coopera: 40,
  curtai: 40,
  itau: 40,
};

function normalizePrograma(nome) {
  return (nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function valorMilheiroPatrimonio(nome) {
  const key = normalizePrograma(nome);
  for (const marca in VALOR_MILHEIRO_PATRIMONIO) {
    if (key.includes(marca)) return VALOR_MILHEIRO_PATRIMONIO[marca];
  }
  return 0;
}

function monthlyOccurrences(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  let y = start.getFullYear();
  let m = start.getMonth();
  const day = start.getDate();
  while (count < 600) {
    const lastDay = new Date(y, m + 1, 0).getDate();
    const occurrence = new Date(y, m, Math.min(day, lastDay), 12, 0, 0);
    if (occurrence > end) break;
    count += 1;
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return count;
}

function elapsedSubscriptionLabel(startIso, endIso) {
  if (!startIso) return "—";
  const start = new Date(`${startIso}T12:00:00`);
  const today = new Date();
  const end = endIso ? new Date(`${endIso}T12:00:00`) : today;
  const effectiveEnd = end < today ? end : today;
  if (effectiveEnd < start) return "Ainda não iniciou";
  let months = (effectiveEnd.getFullYear() - start.getFullYear()) * 12 + effectiveEnd.getMonth() - start.getMonth();
  if (effectiveEnd.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  if (months < 1) return "Menos de 1 mês";
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} ${years === 1 ? "ano" : "anos"}${rest ? ` e ${rest} ${rest === 1 ? "mês" : "meses"}` : ""}`;
}

// ---------- Config-driven modules (sidebar items reproduzidos genericamente) ----------
const MODULES = [
  { key: "assinaturas", label: "Assinaturas", icon: CreditCard, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "accounts", labelField: "programa" },
      { key: "milhasMes", label: "Milhas por mês", type: "number" },
      { key: "valorMensal", label: "Valor mensal", type: "currency" },
      { key: "inicio", label: "Início", type: "date" },
      { key: "vencimento", label: "Vencimento", type: "date" },
      { key: "descricao", label: "Descrição", type: "text", optional: true },
  ]},
  { key: "passageiros", label: "Passageiros", icon: User, fields: [
      { key: "nome", label: "Nome", type: "text" },
      { key: "cpf", label: "CPF", type: "text" },
      { key: "nascimento", label: "Nascimento", type: "date" },
  ]},
  { key: "reservas", label: "Reservas", icon: CalendarCheck, fields: [
      { key: "passageiroId", label: "Passageiro", type: "relation", relationTo: "passageiros", labelField: "nome" },
      { key: "tipo", label: "Tipo", type: "select", options: ["Voo", "Hotel", "Serviço"] },
      { key: "destino", label: "Destino", type: "text" },
      { key: "data", label: "Data", type: "date" },
      { key: "valorPago", label: "Valor pago", type: "currency" },
      { key: "valorMercado", label: "Valor de mercado", type: "currency" },
  ]},
  { key: "comprasBonificadas", label: "Compras Bonificadas", icon: Gift, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "accounts", labelField: "programa" },
      { key: "pontos", label: "Pontos comprados", type: "number" },
      { key: "bonusPct", label: "Bônus (%)", type: "number" },
      { key: "valorPago", label: "Valor pago", type: "currency" },
      { key: "data", label: "Data", type: "date" },
  ]},
  { key: "compraDePontos", label: "Compra de Pontos", icon: ShoppingCart, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "accounts", labelField: "programa" },
      { key: "pontos", label: "Pontos", type: "number" },
      { key: "valorPago", label: "Valor pago", type: "currency" },
      { key: "data", label: "Data", type: "date" },
  ]},
  { key: "creditosCartao", label: "Créditos de Cartão", icon: BadgePercent, fields: [
      { key: "cartao", label: "Cartão", type: "text" },
      { key: "pontosPorReal", label: "Pontos por R$", type: "number" },
      { key: "faturaMes", label: "Fatura do mês", type: "currency" },
      { key: "pontosAcumulados", label: "Pontos acumulados", type: "number" },
  ]},
  { key: "transferencias", label: "Transferências", icon: ArrowLeftRight, fields: [
      { key: "origemId", label: "Origem", type: "relation", relationTo: "accounts", labelField: "programa" },
      { key: "destinoId", label: "Destino", type: "relation", relationTo: "accounts", labelField: "programa" },
      { key: "pontos", label: "Pontos transferidos", type: "number" },
      { key: "bonusPct", label: "Bônus (%)", type: "number" },
      { key: "data", label: "Data", type: "date" },
  ]},
  { key: "vendasDeMilhas", label: "Vendas de Milhas", icon: DollarSign, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "accounts", labelField: "programa" },
      { key: "milhas", label: "Milhas vendidas", type: "number" },
      { key: "valorVenda", label: "Valor da venda", type: "currency" },
      { key: "comprador", label: "Comprador", type: "text" },
      { key: "data", label: "Data", type: "date" },
  ]},
  { key: "resgates", label: "Resgates", icon: Ticket, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "accounts", labelField: "programa" },
      { key: "milhas", label: "Milhas usadas", type: "number" },
      { key: "descricao", label: "Resgate", type: "text" },
      { key: "valorEconomizado", label: "Economia", type: "currency" },
      { key: "data", label: "Data", type: "date" },
  ]},
];

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "programas", label: "Programas", icon: Wallet },
  { key: "proximasViagens", label: "Planejamento de Viagens", icon: MapPin },
  { key: "emissoes", label: "Emissões", icon: PlaneTakeoff },
  { key: "assinaturas", label: "Assinaturas", icon: CreditCard },
  { key: "reservas", label: "Reservas de Hotel", icon: Hotel },
  { key: "comprasBonificadas", label: "Compras Bonificadas", icon: Gift },
  { key: "compraDePontos", label: "Compra de Pontos", icon: ShoppingCart },
  { key: "creditosCartao", label: "Créditos de Cartão", icon: BadgePercent },
  { key: "transferencias", label: "Transferências", icon: ArrowLeftRight },
  { key: "vendasDeMilhas", label: "Vendas de Milhas", icon: DollarSign },
];

const EMPTY_DB = { accounts: [], emissions: [], proximasViagens: [], assinaturas: [], passageiros: [], reservas: [], comprasBonificadas: [], compraDePontos: [], creditosCartao: [], transferencias: [], vendasDeMilhas: [], resgates: [] };

// ---------- CSS compartilhado entre o painel do cliente e o do admin ----------
const APP_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  .mk-root {
    --bg: #050912; --bg-2: #0B1A3D; --card: #0F2049; --card-2: #16305E;
    --accent: #2E6FF2; --accent-2: #5ED0FF; --green: #34C495; --red: #FF6B6B;
    --ink: #EAF1FF; --muted: #8CA2C9;
    color-scheme: dark;
    font-family: 'Space Grotesk', sans-serif;
    background: radial-gradient(circle at 15% -10%, rgba(94,208,255,0.16), transparent 45%), radial-gradient(circle at 100% 0%, rgba(46,111,242,0.18), transparent 40%), linear-gradient(160deg, var(--bg), var(--bg-2) 70%);
    color: var(--ink); min-height: 100vh; box-sizing: border-box; overflow: hidden;
  }
  .mk-root * { box-sizing: border-box; }
  .mk-mono { font-family: 'IBM Plex Mono', monospace; }
  .mk-display { font-family: 'Sora', sans-serif; font-weight: 800; letter-spacing: -0.3px; }
  .mk-app { display: flex; align-items: stretch; min-height: 100vh; }
  .mk-sidebar { width: 224px; flex-shrink: 0; background: rgba(3,7,16,0.55); border-right: 1px solid rgba(94,208,255,0.1); padding: 20px 12px; display: flex; flex-direction: column; }
  .mk-sidebar-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; padding: 0 6px; }
  .mk-logo-badge { width: 36px; height: 36px; border-radius: 11px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 1px rgba(94,208,255,0.3), 0 8px 18px rgba(46,111,242,0.4); transform: rotate(-6deg); flex-shrink: 0; }
  .mk-logo-badge svg { transform: rotate(6deg); color: #fff; }
  .mk-sidebar-brand .name { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 15px; line-height: 1.1; background: linear-gradient(90deg, var(--ink), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .mk-sidebar-brand .sub { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--accent-2); font-weight: 600; }
  .mk-navlist { display: flex; flex-direction: column; gap: 2px; max-height: calc(100vh - 140px); overflow-y: auto; flex: 1; }
  .mk-navitem { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 12.5px; color: var(--muted); cursor: pointer; background: none; border: none; text-align: left; width: 100%; font-family: 'Space Grotesk', sans-serif; }
  .mk-navitem:hover { color: var(--ink); background: rgba(234,241,255,0.05); }
  .mk-navitem.active { background: linear-gradient(90deg, rgba(46,111,242,0.28), rgba(94,208,255,0.06)); color: #fff; font-weight: 600; box-shadow: inset 2px 0 0 var(--accent-2); }
  .mk-navitem svg { flex-shrink: 0; }
  .mk-main { flex: 1; min-width: 0; padding: 22px 26px 50px; overflow-x: hidden; }
  .mk-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .mk-topbar h2 { margin: 0; font-family: 'Sora', sans-serif; font-size: 21px; font-weight: 700; }
  .mk-userpill { display: flex; align-items: center; gap: 8px; background: rgba(234,241,255,0.06); border: 1px solid rgba(234,241,255,0.14); padding: 7px 12px; border-radius: 999px; font-size: 12.5px; color: var(--ink); font-family: 'Space Grotesk', sans-serif; }
  .mk-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 22px; }
  .mk-stub { background: var(--card); color: var(--ink); border: 1px solid rgba(94,208,255,0.14); border-radius: 10px; padding: 16px 16px 14px; position: relative; overflow: hidden; }
  .mk-stub::after { content: ""; position: absolute; left: 0; right: 0; bottom: 38px; border-bottom: 1.5px dashed rgba(234,241,255,0.14); }
  .mk-stub-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .mk-stub-value { font-size: 22px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; }
  .mk-stub-foot { margin-top: 12px; font-size: 10.5px; color: var(--muted); }
  .mk-section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
  .mk-section-title h2 { font-size: 17px; margin: 0; font-family: 'Sora', sans-serif; font-weight: 700; }
  .mk-btn { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); color: #06122B; border: none; padding: 9px 14px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; box-shadow: 0 6px 16px rgba(46,111,242,0.35); }
  .mk-btn:hover { filter: brightness(1.08); }
  .mk-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
  .mk-card-list { display: flex; flex-direction: column; gap: 12px; }
  .mk-ticket { background: var(--card); color: var(--ink); border: 1px solid rgba(94,208,255,0.14); border-radius: 10px; display: grid; grid-template-columns: 1fr auto; overflow: hidden; }
  .mk-ticket-main { padding: 14px 16px; }
  .mk-ticket-side { background: var(--card-2); border-left: 1.5px dashed rgba(234,241,255,0.14); padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; min-width: 130px; }
  .mk-ticket-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .mk-ticket-title { font-weight: 700; font-size: 14.5px; display: flex; align-items: center; gap: 8px; }
  .mk-badge { background: linear-gradient(90deg, var(--accent), var(--accent-2)); color: #06122B; font-size: 10px; padding: 3px 9px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  .mk-field { font-size: 12px; color: var(--muted); }
  .mk-field b { color: var(--ink); font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
  .mk-iconbtn { background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; }
  .mk-iconbtn:hover { color: var(--red); }
  .mk-eyebtn { background: none; border: none; cursor: pointer; color: var(--muted); display: inline-flex; }
  .mk-empty { background: rgba(234,241,255,0.04); border: 1px dashed rgba(234,241,255,0.2); border-radius: 10px; padding: 30px; text-align: center; color: var(--muted); font-size: 13.5px; }
  .mk-table-wrap { background: var(--card); border: 1px solid rgba(94,208,255,0.14); border-radius: 10px; overflow-x: auto; }
  .mk-table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 480px; }
  .mk-table th { text-align: left; padding: 10px 14px; color: var(--muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(234,241,255,0.1); white-space: nowrap; }
  .mk-table td { padding: 10px 14px; border-bottom: 1px solid rgba(234,241,255,0.06); white-space: nowrap; }
  .mk-table tr:last-child td { border-bottom: none; }
  .mk-table td:last-child { text-align: right; }
  .mk-modal-backdrop { position: fixed; inset: 0; background: rgba(5,9,18,0.75); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
  .mk-modal { background: var(--card); color: var(--ink); border-radius: 12px; border: 1px solid rgba(94,208,255,0.18); padding: 22px; width: 100%; max-width: 440px; max-height: 86vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .mk-modal h3 { font-family: 'Sora', sans-serif; font-weight: 700; margin: 0 0 14px; font-size: 17px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .mk-form-row { margin-bottom: 12px; display: flex; flex-direction: column; gap: 5px; }
  .mk-form-row label { font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  .mk-form-row input, .mk-form-row select, .mk-form-row textarea { border: 1px solid rgba(234,241,255,0.18); border-radius: 7px; padding: 9px 10px; font-size: 13.5px; font-family: 'Space Grotesk', sans-serif; background: rgba(234,241,255,0.06); color: var(--ink); }
  .mk-form-row select option { background: #0F2049; color: #EAF1FF; }
  .mk-form-row select:focus, .mk-form-row input:focus, .mk-form-row textarea:focus { outline: 2px solid rgba(94,208,255,0.45); outline-offset: 1px; border-color: var(--accent-2); }
  .mk-check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); margin: 4px 0 10px; }
  .mk-check-row input { width: auto; margin: 0; accent-color: var(--accent); }
  .mk-negative { color: var(--red) !important; }
  .mk-form-row input:disabled { opacity: 0.5; }
  .mk-form-row input::placeholder { color: rgba(234,241,255,0.35); }
  .mk-form-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .mk-preview { background: var(--card-2); border: 1px solid rgba(94,208,255,0.16); border-radius: 8px; padding: 12px 14px; margin-top: 6px; font-size: 13px; }
  .mk-preview .economia { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 16px; }
  .mk-alert-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(234,241,255,0.08); font-size: 13px; }
  .mk-alert-row:last-child { border-bottom: none; }
  .mk-signout-wrap { margin-top: 14px; padding-top: 14px; border-top: 1px dashed rgba(234,241,255,0.14); }
  .mk-programa-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
  .mk-programa-card { background: var(--card); border: 1px solid rgba(94,208,255,0.14); border-radius: 12px; padding: 16px; }
  .mk-programa-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .mk-programa-name { font-weight: 700; font-size: 14px; }
  .mk-programa-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
  .mk-progress-track { height: 5px; background: rgba(234,241,255,0.1); border-radius: 4px; margin-top: 6px; overflow: hidden; }
  .mk-progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 4px; }
  .mk-switcher { position: absolute; top: calc(100% + 8px); right: 0; background: var(--card); border: 1px solid rgba(94,208,255,0.18); border-radius: 10px; min-width: 230px; max-height: 320px; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.5); z-index: 40; padding: 6px; }
  .mk-switcher-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); padding: 8px 10px 4px; }
  .mk-switcher-item { display: block; width: 100%; text-align: left; background: none; border: none; color: var(--ink); font-size: 13px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; }
  .mk-switcher-item:hover { background: rgba(234,241,255,0.06); }
  .mk-impersonate-banner { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; background: linear-gradient(90deg, rgba(46,111,242,0.18), rgba(94,208,255,0.06)); border: 1px solid rgba(94,208,255,0.25); border-radius: 10px; padding: 10px 14px; margin-bottom: 18px; font-size: 13px; }

  /* ---------- Responsividade ---------- */
  .mk-menu-toggle { display: none; background: rgba(234,241,255,0.06); border: 1px solid rgba(234,241,255,0.14); color: var(--ink); padding: 8px 10px; border-radius: 8px; cursor: pointer; align-items: center; justify-content: center; flex-shrink: 0; }
  .mk-sidebar-close { display: none; margin-left: auto; background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; }
  .mk-sidebar-overlay { display: none; }
  .mk-topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .mk-topbar-left h2 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @media (max-width: 860px) {
    .mk-app { position: relative; }
    .mk-sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 60; width: 250px;
      transform: translateX(-100%); transition: transform .25s ease;
      box-shadow: 20px 0 60px rgba(0,0,0,0.5); border-radius: 0; overflow-y: auto;
    }
    .mk-sidebar.open { transform: translateX(0); }
    .mk-sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(5,9,18,0.6); z-index: 55; }
    .mk-menu-toggle { display: inline-flex; }
    .mk-sidebar-close { display: inline-flex; }
    .mk-main { padding: 16px 16px 40px; width: 100%; }
    .mk-topbar h2 { font-size: 18px; }
    .mk-form-cols { grid-template-columns: 1fr; }
    .mk-ticket { grid-template-columns: 1fr; }
    .mk-ticket-side { border-left: none; border-top: 1.5px dashed rgba(234,241,255,0.14); flex-direction: row; align-items: center; justify-content: space-between; }
    .mk-switcher { right: 0; left: auto; max-width: calc(100vw - 64px); }
    .mk-userpill span.mk-userpill-text { max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
  @media (max-width: 480px) {
    .mk-root { border-radius: 0; }
    .mk-stub-value { font-size: 19px; }
    .mk-login-card { padding: 22px 18px; }
    .mk-topbar h2 { font-size: 16px; }
    .mk-table { font-size: 11.5px; }
  }
`;

function renderCell(field, row, allData) {
  const v = row[field.key];
  if (field.type === "relation") {
    const found = (allData[field.relationTo] || []).find((r) => r.id === v);
    return found ? found[field.labelField] : "—";
  }
  if (field.type === "currency") {
    const num = Number(v) || 0;
    return <span className={num < 0 ? "mk-negative" : ""}>{formatBRL(num)}</span>;
  }
  if (field.type === "date") return formatDate(v);
  if (field.type === "number") return (Number(v) || 0).toLocaleString("pt-BR");
  return v || "—";
}

function DataModule({ schema, data, setData, allData }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const save = (values) => {
    if (editing) setData((prev) => prev.map((d) => (d.id === editing.id ? { ...editing, ...values, id: editing.id } : d)));
    else setData((prev) => [...prev, { ...values, id: uid() }]);
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => setData((prev) => prev.filter((d) => d.id !== id));

  return (
    <>
      <div className="mk-section-title">
        <h2>{schema.label}</h2>
        <button className="mk-btn" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> {schema.key === "assinaturas" ? "Nova Assinatura" : "Nova entrada"}</button>
      </div>
      {data.length === 0 ? (
        <div className="mk-empty">Nenhum registro em {schema.label.toLowerCase()} ainda.</div>
      ) : (
        <div className="mk-table-wrap">
          <table className="mk-table">
            <thead><tr>{schema.fields.map((f) => <th key={f.key}>{f.label}</th>)}<th></th></tr></thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  {schema.fields.map((f) => <td key={f.key}>{renderCell(f, row, allData)}</td>)}
                  <td>
                    <button className="mk-iconbtn" onClick={() => { setEditing(row); setShowForm(true); }}><Pencil size={14} /></button>
                    <button className="mk-iconbtn" onClick={() => remove(row.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <GenericFormModal schema={schema} initial={editing} allData={allData}
          onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />
      )}
    </>
  );
}

function GenericFormModal({ schema, initial, allData, onClose, onSave }) {
  const defaults = () => schema.fields.reduce((acc, f) => {
    acc[f.key] = initial ? (initial[f.key] ?? "") : (f.type === "relation" ? ((allData[f.relationTo] || [])[0]?.id || "") : (f.type === "select" ? f.options[0] : ""));
    return acc;
  }, {});
  const [form, setForm] = useState(defaults);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const requiredTextFields = schema.fields.filter((f) => f.type === "text" && !f.optional);
  const requiredOk = requiredTextFields.length === 0 || requiredTextFields.every((f) => !!form[f.key]);

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>{initial ? "Editar" : "Nova"} entrada — {schema.label} <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        {schema.fields.map((f) => (
          <div className="mk-form-row" key={f.key}>
            <label>{f.label}</label>
            {f.type === "select" && (
              <select value={form[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {f.type === "relation" && (
              <select value={form[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                {(allData[f.relationTo] || []).length === 0 && <option value="">Nenhum cadastrado</option>}
                {(allData[f.relationTo] || []).map((r) => <option key={r.id} value={r.id}>{r[f.labelField]}</option>)}
              </select>
            )}
            {f.type === "date" && <input type="date" value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
            {(f.type === "number" || f.type === "currency") && (
              <input type="number" step={f.type === "currency" ? "0.01" : "1"} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            )}
            {f.type === "text" && <input value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
          </div>
        ))}
        {schema.key === "reservas" && form.valorPago && form.valorMercado && (
          <div className="mk-preview">
            Economia estimada: <span className="economia" style={{ color: (Number(form.valorMercado) - Number(form.valorPago)) >= 0 ? "#34C495" : "#FF6B6B" }}>
              {formatBRL(Number(form.valorMercado) - Number(form.valorPago))}
            </span>
          </div>
        )}
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={!requiredOk} onClick={() => onSave(form)}>
          Salvar
        </button>
      </div>
    </div>
  );
}

// ---------- Painel do cliente (usado tanto pelo cliente logado quanto pelo admin em "ver como") ----------
function PainelMilhas({ userId, userEmail, onSignOut, impersonating }) {
  const [tab, setTab] = useState("dashboard");
  const [db, setDb] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showCpf, setShowCpf] = useState({});
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showEmissionForm, setShowEmissionForm] = useState(false);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showCreditCardForm, setShowCreditCardForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingEmission, setEditingEmission] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editingHotel, setEditingHotel] = useState(null);
  const [editingCreditCard, setEditingCreditCard] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("app_data").select("data").eq("user_id", userId).maybeSingle();
      if (error) console.error(error);
      setDb(data ? { ...EMPTY_DB, ...data.data } : EMPTY_DB);
    })();
    supabase.from("profiles").select("nome, email, plano_valor, plano_parcelas, plano_inicio, plano_fim").eq("id", userId).maybeSingle().then(({ data }) => {
      setProfile(data || {});
    });
  }, [userId]);

  useEffect(() => {
    if (!userEmail) return;
    supabase.from("profiles").update({ email: userEmail }).eq("id", userId).then(({ error }) => {
      if (error) console.error(error);
    });
  }, [userId, userEmail]);

  useEffect(() => {
    if (!db) return;
    const timeout = setTimeout(() => {
      supabase.from("app_data").upsert({ user_id: userId, data: db, updated_at: new Date().toISOString() }).then(({ error }) => {
        if (error) console.error(error);
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [db, userId]);

  useEffect(() => {
    if (!db || !(db.assinaturas || []).length) return;
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let changed = false;
    let nextAccounts = [...(db.accounts || [])];

    const nextAssinaturas = (db.assinaturas || []).map((assinatura) => {
      const milhasMes = Number(assinatura.milhasMes || 0);
      const valorMensal = Number(assinatura.valorMensal || 0);
      if (!assinatura.programaId || !assinatura.inicio || milhasMes <= 0) return assinatura;

      const limite = assinatura.vencimento && assinatura.vencimento < todayIso ? assinatura.vencimento : todayIso;
      const devidos = monthlyOccurrences(assinatura.inicio, limite);
      const creditados = Number(assinatura.creditosGerados || 0);
      const novosCreditos = Math.max(0, devidos - creditados);
      if (!novosCreditos) return assinatura;

      const accountIndex = nextAccounts.findIndex((a) => a.id === assinatura.programaId);
      if (accountIndex < 0) return assinatura;

      const conta = nextAccounts[accountIndex];
      const saldoAnterior = Number(conta.saldo || 0);
      const custoAnterior = (saldoAnterior / 1000) * Number(conta.cpm || 0);
      const milhasAdicionadas = novosCreditos * milhasMes;
      const custoAdicionado = novosCreditos * valorMensal;
      const novoSaldo = saldoAnterior + milhasAdicionadas;
      const novoCpm = novoSaldo > 0 ? ((custoAnterior + custoAdicionado) / novoSaldo) * 1000 : Number(conta.cpm || 0);

      nextAccounts[accountIndex] = { ...conta, saldo: novoSaldo, cpm: Number(novoCpm.toFixed(4)) };
      changed = true;
      return { ...assinatura, creditosGerados: devidos, ultimoCredito: limite };
    });

    if (changed) setDb((prev) => ({ ...prev, accounts: nextAccounts, assinaturas: nextAssinaturas }));
  }, [db]);

  const updateSlice = (key) => (updater) =>
    setDb((prev) => ({ ...prev, [key]: typeof updater === "function" ? updater(prev[key]) : updater }));

  const accounts = db?.accounts || [], emissions = db?.emissions || [], proximasViagens = db?.proximasViagens || [];
  const setAccounts = updateSlice("accounts"), setEmissions = updateSlice("emissions"), setProximasViagens = updateSlice("proximasViagens");
  const displayName = profile?.nome?.trim() || userEmail;

  const emissionsCalc = useMemo(() => emissions.map((em) => {
    const conta = accounts.find((a) => a.id === em.accountId);
    const cpm = conta ? Number(conta.cpm) : 0;
    const custoMilhas = (Number(em.milhas) / 1000) * cpm;
    const custoTotal = custoMilhas + Number(em.taxas || 0);
    const economia = Number(em.valorMercado || 0) - custoTotal;
    const pct = em.valorMercado ? (economia / Number(em.valorMercado)) * 100 : 0;
    const passageiros = Math.max(1, Number(em.passageiros || 1));
    const valorMercadoPorPassagem = Number(em.valorMercado || 0) / passageiros;
    const economiaPorPassagem = economia / passageiros;
    const custoPorPassagem = custoTotal / passageiros;
    return { ...em, conta, custoMilhas, custoTotal, economia, pct, passageiros, valorMercadoPorPassagem, economiaPorPassagem, custoPorPassagem };
  }).sort((a, b) => (b.data || "").localeCompare(a.data || "")), [emissions, accounts]);

  const reservasCalc = useMemo(() => (db?.reservas || []).map((r) => {
    const conta = accounts.find((a) => a.id === r.programaId);
    const cpm = conta ? Number(conta.cpm || 0) : Number(r.cpmUsado || 0);
    const custoPontos = r.valorPago != null && r.programaId == null
      ? Number(r.valorPago || 0)
      : (Number(r.pontosMilhas || 0) / 1000) * cpm;
    const economia = Number(r.valorMercado || 0) - custoPontos;
    return { ...r, conta, cpm, custoPontos, economia };
  }), [db, accounts]);

  const totals = useMemo(() => {
    const totalPontos = accounts.filter((a) => inferTipo(a) !== "Aéreo").reduce((s, a) => s + Number(a.saldo || 0), 0);
    const totalMilhas = accounts.filter((a) => inferTipo(a) === "Aéreo").reduce((s, a) => s + Number(a.saldo || 0), 0);

    const patrimonioEstimado = accounts.reduce((s, a) => {
      const valorMilheiro = valorMilheiroPatrimonio(a.programa);
      return s + (Number(a.saldo || 0) / 1000) * valorMilheiro;
    }, 0);

    const economiaEmissoes = emissionsCalc.reduce((s, e) => s + e.economia, 0);
    const economiaReservas = reservasCalc.reduce((s, r) => s + r.economia, 0);
    const vencendo = accounts.filter((a) => a.validade).map((a) => ({ ...a, dias: Math.ceil((new Date(a.validade) - new Date()) / 86400000) })).filter((a) => a.dias <= 60).sort((a, b) => a.dias - b.dias);

    const custoMilhasEPontos = accounts.reduce((s, a) => s + (Number(a.saldo || 0) / 1000) * Number(a.cpm || 0), 0);
    const custoAssinaturas = (db?.assinaturas || []).reduce((s, a) => s + Number(a.valorMensal || 0), 0);
    const custoTaxasEmbarque = emissions.reduce((s, e) => s + Number(e.taxas || 0), 0);
    const planoValor = Number(profile?.plano_valor || 0);
    const planoParcelas = Number(profile?.plano_parcelas || 0);
    const custoPlanoMensal = planoParcelas > 0 ? planoValor / planoParcelas : planoValor;
    const custoTotal = custoMilhasEPontos + custoAssinaturas + custoTaxasEmbarque + custoPlanoMensal;

    // Mantém a lógica anterior da Economia Total separada do novo card de Custo Total,
    // evitando descontar novamente o custo do saldo atual de pontos/milhas.
    const custoCompras = (db?.compraDePontos || []).reduce((s, c) => s + Number(c.valorPago || 0), 0)
      + (db?.comprasBonificadas || []).reduce((s, c) => s + Number(c.valorPago || 0), 0);
    const custosParaEconomia = custoPlanoMensal + custoAssinaturas + custoCompras;
    const economiaTotal = economiaEmissoes + economiaReservas - custosParaEconomia;

    return {
      totalPontos,
      totalMilhas,
      patrimonioEstimado,
      economiaEmissoes,
      economiaReservas,
      vencendo,
      custoMilhasEPontos,
      custoAssinaturas,
      custoTaxasEmbarque,
      custoPlanoMensal,
      custoTotal,
      economiaTotal,
    };
  }, [accounts, emissions, emissionsCalc, reservasCalc, profile, db]);

  // Cards de programa, agrupando as contas por programa (estilo "Visão Geral das Contas")
  const porProgramaCards = useMemo(() => {
    const map = {};
    accounts.forEach((a) => {
      const key = a.programa || "Outro";
      if (!map[key]) map[key] = { programa: key, saldo: 0, cpmSum: 0, cpmCount: 0, cpfs: new Set() };
      map[key].saldo += Number(a.saldo || 0);
      map[key].cpmSum += Number(a.cpm || 0);
      map[key].cpmCount += 1;
      map[key].cpfs.add(a.cpf);
    });
    return Object.values(map).map((p) => ({
      ...p,
      cpmAvg: p.cpmCount ? p.cpmSum / p.cpmCount : 0,
      cpfCount: p.cpfs.size,
    })).sort((a, b) => b.saldo - a.saldo);
  }, [accounts, db]);

  const cpfGroups = useMemo(() => {
    const map = {};
    accounts.forEach((a) => {
      const key = a.cpf || "—";
      if (!map[key]) map[key] = { cpf: key, titular: a.titular, contas: [] };
      map[key].contas.push(a);
    });
    return Object.values(map);
  }, [accounts]);

  const addAccount = (data) => setAccounts((prev) => [...prev, { id: uid(), ...data }]);
  const updateAccount = (id, data) => setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, ...data, id } : a));
  const removeAccount = (id) => { setAccounts((prev) => prev.filter((a) => a.id !== id)); setEmissions((prev) => prev.filter((e) => e.accountId !== id)); };

  const addEmission = (data) => {
    setDb((prev) => {
      const shouldDebit = data.origemMilhas === "saldo";
      const nextAccounts = shouldDebit ? (prev.accounts || []).map((a) => a.id === data.accountId
        ? { ...a, saldo: Math.max(0, Number(a.saldo || 0) - Number(data.milhas || 0)) }
        : a) : (prev.accounts || []);
      return { ...prev, accounts: nextAccounts, emissions: [...(prev.emissions || []), { id: uid(), ...data, saldoDebitado: shouldDebit }] };
    });
  };
  const updateEmission = (id, data) => {
    setDb((prev) => {
      const old = (prev.emissions || []).find((e) => e.id === id);
      let nextAccounts = [...(prev.accounts || [])];
      if (old?.saldoDebitado) {
        nextAccounts = nextAccounts.map((a) => a.id === old.accountId ? { ...a, saldo: Number(a.saldo || 0) + Number(old.milhas || 0) } : a);
      }
      const shouldDebit = data.origemMilhas === "saldo";
      if (shouldDebit) {
        nextAccounts = nextAccounts.map((a) => a.id === data.accountId ? { ...a, saldo: Math.max(0, Number(a.saldo || 0) - Number(data.milhas || 0)) } : a);
      }
      return { ...prev, accounts: nextAccounts, emissions: (prev.emissions || []).map((e) => e.id === id ? { ...e, ...data, id, saldoDebitado: shouldDebit } : e) };
    });
  };
  const removeEmission = (id) => {
    setDb((prev) => {
      const em = (prev.emissions || []).find((e) => e.id === id);
      const nextAccounts = em?.saldoDebitado ? (prev.accounts || []).map((a) => a.id === em.accountId
        ? { ...a, saldo: Number(a.saldo || 0) + Number(em.milhas || 0) }
        : a) : (prev.accounts || []);
      return { ...prev, accounts: nextAccounts, emissions: (prev.emissions || []).filter((e) => e.id !== id) };
    });
  };

  const addTrip = (data) => setProximasViagens((prev) => [...prev, { id: uid(), ...data }]);
  const updateTrip = (id, data) => setProximasViagens((prev) => prev.map((v) => v.id === id ? { ...v, ...data, id } : v));
  const removeTrip = (id) => setProximasViagens((prev) => prev.filter((v) => v.id !== id));

  const addHotelReservation = (data) => {
    setDb((prev) => {
      const shouldDebit = data.origemMilhas === "saldo";
      const nextAccounts = shouldDebit ? (prev.accounts || []).map((a) => a.id === data.programaId
        ? { ...a, saldo: Math.max(0, Number(a.saldo || 0) - Number(data.pontosMilhas || 0)) }
        : a) : (prev.accounts || []);
      return { ...prev, accounts: nextAccounts, reservas: [...(prev.reservas || []), { id: uid(), ...data, saldoDebitado: shouldDebit }] };
    });
  };
  const updateHotelReservation = (id, data) => {
    setDb((prev) => {
      const old = (prev.reservas || []).find((r) => r.id === id);
      let nextAccounts = [...(prev.accounts || [])];
      if (old?.saldoDebitado) {
        nextAccounts = nextAccounts.map((a) => a.id === old.programaId ? { ...a, saldo: Number(a.saldo || 0) + Number(old.pontosMilhas || 0) } : a);
      }
      const shouldDebit = data.origemMilhas === "saldo";
      if (shouldDebit) {
        nextAccounts = nextAccounts.map((a) => a.id === data.programaId ? { ...a, saldo: Math.max(0, Number(a.saldo || 0) - Number(data.pontosMilhas || 0)) } : a);
      }
      return { ...prev, accounts: nextAccounts, reservas: (prev.reservas || []).map((r) => r.id === id ? { ...r, ...data, id, saldoDebitado: shouldDebit } : r) };
    });
  };
  const removeHotelReservation = (id) => {
    setDb((prev) => {
      const r = (prev.reservas || []).find((x) => x.id === id);
      const nextAccounts = r?.saldoDebitado ? (prev.accounts || []).map((a) => a.id === r.programaId
        ? { ...a, saldo: Number(a.saldo || 0) + Number(r.pontosMilhas || 0) }
        : a) : (prev.accounts || []);
      return { ...prev, accounts: nextAccounts, reservas: (prev.reservas || []).filter((x) => x.id !== id) };
    });
  };

  const addCreditCard = (data) => {
    setDb((prev) => ({
      ...prev,
      accounts: (prev.accounts || []).map((a) => a.id === data.programaId ? { ...a, saldo: Number(a.saldo || 0) + Number(data.pontosAcumulados || 0) } : a),
      creditosCartao: [...(prev.creditosCartao || []), { id: uid(), ...data, saldoCreditado: true }],
    }));
  };
  const updateCreditCard = (id, data) => {
    setDb((prev) => {
      const old = (prev.creditosCartao || []).find((c) => c.id === id);
      let nextAccounts = [...(prev.accounts || [])];
      if (old?.saldoCreditado) {
        nextAccounts = nextAccounts.map((a) => a.id === old.programaId ? { ...a, saldo: Math.max(0, Number(a.saldo || 0) - Number(old.pontosAcumulados || 0)) } : a);
      }
      nextAccounts = nextAccounts.map((a) => a.id === data.programaId ? { ...a, saldo: Number(a.saldo || 0) + Number(data.pontosAcumulados || 0) } : a);
      return { ...prev, accounts: nextAccounts, creditosCartao: (prev.creditosCartao || []).map((c) => c.id === id ? { ...c, ...data, id, saldoCreditado: true } : c) };
    });
  };
  const removeCreditCard = (id) => {
    setDb((prev) => {
      const c = (prev.creditosCartao || []).find((x) => x.id === id);
      const nextAccounts = c?.saldoCreditado ? (prev.accounts || []).map((a) => a.id === c.programaId
        ? { ...a, saldo: Math.max(0, Number(a.saldo || 0) - Number(c.pontosAcumulados || 0)) }
        : a) : (prev.accounts || []);
      return { ...prev, accounts: nextAccounts, creditosCartao: (prev.creditosCartao || []).filter((x) => x.id !== id) };
    });
  };
  const tripsSorted = [...proximasViagens].sort((a, b) => {
    if (a.semData && !b.semData) return 1;
    if (!a.semData && b.semData) return -1;
    return (a.data || "9999-12-31").localeCompare(b.data || "9999-12-31");
  });

  const activeModule = MODULES.find((m) => m.key === tab && !["reservas", "creditosCartao"].includes(m.key));
  const currentLabel = NAV.find((n) => n.key === tab)?.label || "Dashboard";

  if (!db) return <div style={{ background: "#050912", minHeight: "100%", padding: 40, color: "#8CA2C9", fontFamily: "sans-serif" }}>Carregando…</div>;

  return (
    <div className="mk-root">
      <style>{APP_CSS}</style>
      <div className="mk-app">
        {sidebarOpen && <div className="mk-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <div className={`mk-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="mk-sidebar-brand">
            <div className="mk-logo-badge"><Plane size={17} strokeWidth={2.2} /></div>
            <div><div className="sub">Arduini</div><div className="name">Viaja que rola</div></div>
            <button className="mk-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>
          <div className="mk-navlist">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <button key={n.key} className={`mk-navitem ${tab === n.key ? "active" : ""}`} onClick={() => { setTab(n.key); setSidebarOpen(false); }}>
                  <Icon size={15} /> {n.label}
                </button>
              );
            })}
          </div>
          {!impersonating && (
            <div className="mk-signout-wrap">
              <div className="mk-field" style={{ marginBottom: 6 }}>{userEmail}</div>
              <button className="mk-navitem" onClick={onSignOut}>Sair</button>
            </div>
          )}
        </div>

        <div className="mk-main">
          <div className="mk-topbar">
            <div className="mk-topbar-left">
              <button className="mk-menu-toggle" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>
              <h2>{currentLabel}</h2>
            </div>
            {impersonating ? (
              <div className="mk-userpill"><User size={14} /> <span className="mk-userpill-text">{displayName}</span></div>
            ) : (
              <button className="mk-userpill" style={{ cursor: "pointer" }} onClick={() => setShowProfileForm(true)} title="Meu perfil">
                <User size={14} /> <span className="mk-userpill-text">{displayName}</span> <Pencil size={12} />
              </button>
            )}
          </div>

          {impersonating && (
            <div className="mk-impersonate-banner">
              <span>Visualizando como <b>{impersonating.nome}</b></span>
              <button className="mk-btn" style={{ padding: "6px 12px" }} onClick={impersonating.onExit}><ArrowLeft size={14} /> Voltar para admin</button>
            </div>
          )}

          {tab === "dashboard" && (
            <>
              <div className="mk-grid">
                <div className="mk-stub">
                  <div className="mk-stub-label"><CreditCard size={13} /> Total de Pontos</div>
                  <div className="mk-stub-value">{totals.totalPontos.toLocaleString("pt-BR")}</div>
                  <div className="mk-stub-foot">Programas de cartão e hotel</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><Plane size={13} /> Total de Milhas</div>
                  <div className="mk-stub-value">{totals.totalMilhas.toLocaleString("pt-BR")}</div>
                  <div className="mk-stub-foot">Programas de companhias aéreas</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><Award size={13} /> Patrimônio Estimado</div>
                  <div className="mk-stub-value">{formatBRL(totals.patrimonioEstimado)}</div>
                  <div className="mk-stub-foot">Pontos + milhas, pelo valor estimado de cada programa</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><Wallet size={13} /> Custo Total</div>
                  <div className="mk-stub-value mk-negative">{formatNegativeBRL(totals.custoTotal)}</div>
                  <div className="mk-stub-foot">Milhas/pontos + clubes + taxas + mensalidade do plano</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><TrendingUp size={13} /> Economia Total</div>
                  <div className="mk-stub-value" style={{ color: totals.economiaTotal >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(totals.economiaTotal)}</div>
                  <div className="mk-stub-foot">Emissões + reservas, descontados os custos</div>
                </div>
              </div>

              <div className="mk-section-title"><h2>Visão Geral das Contas</h2></div>
              {porProgramaCards.length === 0 ? (
                <div className="mk-empty">Nenhum programa cadastrado ainda. Vá em "Programas" para começar.</div>
              ) : (
                <div className="mk-programa-grid" style={{ marginBottom: 22 }}>
                  {porProgramaCards.map((p) => (
                    <div className="mk-programa-card" key={p.programa}>
                      <div className="mk-programa-head">
                        <span className="mk-programa-name">{p.programa}</span>
                        <span className="mk-programa-icon" style={{ background: colorForPrograma(p.programa) }}><Plane size={14} /></span>
                      </div>
                      <div className="mk-field">Saldo Atual</div>
                      <div className="mk-mono" style={{ fontSize: 20, fontWeight: 700 }}>{p.saldo.toLocaleString("pt-BR")}</div>
                      <div className="mk-field" style={{ marginTop: 10 }}>Custo Médio por Milheiro</div>
                      <div className="mk-mono" style={{ fontWeight: 700 }}>{formatBRL(p.cpmAvg)}</div>
                    </div>
                  ))}
                </div>
              )}

              {totals.vencendo.length > 0 && (
                <div>
                  <div className="mk-section-title"><h2>Vencimentos próximos</h2></div>
                  <div className="mk-stub" style={{ paddingBottom: 6 }}>
                    {totals.vencendo.map((a) => (
                      <div className="mk-alert-row" key={a.id}>
                        <span><CalendarClock size={13} style={{ marginRight: 6, verticalAlign: -2 }} />{a.programa} — {a.titular}</span>
                        <span className="mk-mono" style={{ color: a.dias < 0 ? "var(--red)" : "var(--ink)" }}>{a.dias < 0 ? "vencido" : `${a.dias} dia(s)`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "programas" && (
            <>
              <div className="mk-section-title">
                <h2>Programas</h2>
                <button className="mk-btn" onClick={() => { setEditingAccount(null); setShowAccountForm(true); }}><Plus size={15} /> Novo programa</button>
              </div>
              {accounts.length === 0 ? (
                <div className="mk-empty">Nenhum programa cadastrado. Clique em "Novo programa" para começar.</div>
              ) : (
                <div className="mk-card-list">
                  {accounts.map((a) => (
                    <div className="mk-ticket" key={a.id}>
                      <div className="mk-ticket-main">
                        <div className="mk-ticket-row">
                          <span className="mk-ticket-title"><Plane size={15} /> {a.programa}<span className="mk-badge">{a.titular}</span></span>
                          <span>
                            <button className="mk-iconbtn" onClick={() => { setEditingAccount(a); setShowAccountForm(true); }} title="Editar"><Pencil size={15} /></button>
                            <button className="mk-iconbtn" onClick={() => removeAccount(a.id)} title="Excluir"><Trash2 size={15} /></button>
                          </span>
                        </div>
                        {a.cpf && (
                          <div className="mk-field" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                            CPF: <b>{showCpf[a.id] ? a.cpf : maskCpf(a.cpf)}</b>
                            <button className="mk-eyebtn" onClick={() => setShowCpf((s) => ({ ...s, [a.id]: !s[a.id] }))}>{showCpf[a.id] ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                          </div>
                        )}
                        <div className="mk-field">Tipo: <b>{inferTipo(a)}</b> · Custo médio: <b>{formatBRL(a.cpm)} / milheiro</b></div>
                      </div>
                      <div className="mk-ticket-side">
                        <div><div className="mk-field" style={{ textAlign: "right" }}>Saldo</div><div className="mk-mono" style={{ fontSize: 19, fontWeight: 700 }}>{Number(a.saldo).toLocaleString("pt-BR")}</div></div>
                        <div className="mk-field">Validade: {formatDate(a.validade)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "proximasViagens" && (
            <>
              <div className="mk-section-title">
                <h2>Planejamento de Viagens</h2>
                <button className="mk-btn" onClick={() => { setEditingTrip(null); setShowTripForm(true); }}><Plus size={15} /> Nova Viagem</button>
              </div>
              {tripsSorted.length === 0 ? (
                <div className="mk-empty">Nenhum planejamento de viagem cadastrado.</div>
              ) : (
                <div className="mk-card-list">
                  {tripsSorted.map((v) => (
                    <div className="mk-ticket" key={v.id}>
                      <div className="mk-ticket-main">
                        <div className="mk-ticket-row">
                          <span className="mk-ticket-title"><MapPin size={15} /> {v.destino}</span>
                          <span>
                            <button className="mk-iconbtn" onClick={() => { setEditingTrip(v); setShowTripForm(true); }} title="Editar"><Pencil size={15} /></button>
                            <button className="mk-iconbtn" onClick={() => removeTrip(v.id)} title="Excluir"><Trash2 size={15} /></button>
                          </span>
                        </div>
                        <div className="mk-field">Partida: <b>{v.partida || "—"}</b> · Passageiros: <b>{Number(v.passageiros || 1)}</b></div>
                        <div className="mk-field" style={{ marginTop: 5 }}>Data: <b>{v.semData ? "Sem data definida" : formatDate(v.data)}</b>{!v.semData && Number(v.flexibilidade) > 0 ? ` · Flexibilidade +${v.flexibilidade} dias` : ""}</div>
                      </div>
                      <div className="mk-ticket-side">
                        <CalendarCheck size={18} />
                        <div className="mk-field">{v.semData ? "A definir" : formatDate(v.data)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "emissoes" && (
            <>
              <div className="mk-section-title">
                <h2>Emissões</h2>
                <button className="mk-btn" onClick={() => { setEditingEmission(null); setShowEmissionForm(true); }} disabled={accounts.length === 0}><Plus size={15} /> Nova emissão</button>
              </div>
              {accounts.length === 0 ? (
                <div className="mk-empty">Cadastre uma conta primeiro para registrar emissões.</div>
              ) : emissionsCalc.length === 0 ? (
                <div className="mk-empty">Nenhuma emissão registrada ainda.</div>
              ) : (
                <div className="mk-card-list">
                  {emissionsCalc.map((e) => (
                    <div className="mk-ticket" key={e.id}>
                      <div className="mk-ticket-main">
                        <div className="mk-ticket-row">
                          <span className="mk-ticket-title"><Plane size={15} /> {e.destino}<span className="mk-badge">{e.conta ? e.conta.programa : "conta removida"}</span></span>
                          <span>
                            <button className="mk-iconbtn" onClick={() => { setEditingEmission(e); setShowEmissionForm(true); }} title="Editar"><Pencil size={15} /></button>
                            <button className="mk-iconbtn" onClick={() => removeEmission(e.id)} title="Excluir"><Trash2 size={15} /></button>
                          </span>
                        </div>
                        <div className="mk-field">Origem: <b>{e.origemMilhas === "saldo" ? "Saldo em Conta" : "Resgate Anterior"}</b> · Resgate: <b>{formatDate(e.dataResgate || e.data)}</b></div>
                        <div className="mk-field">Ida: <b>{formatDate(e.dataIda)}</b> · Volta: <b>{formatDate(e.dataVolta)}</b> · Passageiros: <b>{e.passageiros}</b> · {Number(e.milhas).toLocaleString("pt-BR")} milhas</div>
                        <div className="mk-field">Taxas: <b className="mk-negative">{formatNegativeBRL(e.taxas)}</b> · Custo estimado total: <b className="mk-negative">{formatNegativeBRL(e.custoTotal)}</b> · Valor de mercado total: <b>{formatBRL(e.valorMercado)}</b></div>
                        <div className="mk-field">Por passagem — Valor estimado: <b>{formatBRL(e.valorMercadoPorPassagem)}</b> · Custo: <b className="mk-negative">{formatNegativeBRL(e.custoPorPassagem)}</b> · Economia: <b style={{ color: e.economiaPorPassagem >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(e.economiaPorPassagem)}</b></div>
                      </div>
                      <div className="mk-ticket-side">
                        <div className="mk-field" style={{ textAlign: "right" }}>Economia</div>
                        <div className="mk-mono" style={{ fontSize: 18, fontWeight: 700, color: e.economia >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(e.economia)}</div>
                        <div className="mk-field">{e.pct.toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}



          {tab === "reservas" && (
            <>
              <div className="mk-section-title">
                <h2>Reservas de Hotel</h2>
                <button className="mk-btn" onClick={() => { setEditingHotel(null); setShowHotelForm(true); }} disabled={accounts.length === 0}><Plus size={15} /> Nova Reserva</button>
              </div>
              {accounts.length === 0 ? <div className="mk-empty">Cadastre um programa primeiro para registrar reservas de hotel.</div> : reservasCalc.length === 0 ? (
                <div className="mk-empty">Nenhuma reserva de hotel registrada ainda.</div>
              ) : (
                <div className="mk-card-list">{reservasCalc.map((r) => (
                  <div className="mk-ticket" key={r.id}>
                    <div className="mk-ticket-main">
                      <div className="mk-ticket-row"><span className="mk-ticket-title"><Hotel size={15} /> {r.hotel || r.destino || "Hotel"}</span><span><button className="mk-iconbtn" onClick={() => { setEditingHotel(r); setShowHotelForm(true); }} title="Editar"><Pencil size={15} /></button><button className="mk-iconbtn" onClick={() => removeHotelReservation(r.id)} title="Excluir"><Trash2 size={15} /></button></span></div>
                      <div className="mk-field">Origem: <b>{r.origemMilhas === "saldo" ? (r.conta?.programa || "Programa removido") : `Resgate Anterior${r.conta?.programa ? ` · ${r.conta.programa}` : ""}`}</b></div>
                      <div className="mk-field">Pontos/Milhas usadas: <b>{Number(r.pontosMilhas || 0).toLocaleString("pt-BR")}</b> · Valor de mercado: <b>{formatBRL(r.valorMercado)}</b></div>
                      <div className="mk-field">Valor pago estimado: <b className="mk-negative">{formatNegativeBRL(r.custoPontos)}</b></div>
                    </div>
                    <div className="mk-ticket-side"><div className="mk-field">Economia</div><div className="mk-mono" style={{ fontSize: 18, fontWeight: 700, color: r.economia >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(r.economia)}</div></div>
                  </div>
                ))}</div>
              )}
            </>
          )}

          {tab === "creditosCartao" && (
            <>
              <div className="mk-section-title">
                <h2>Créditos de Cartão</h2>
                <button className="mk-btn" onClick={() => { setEditingCreditCard(null); setShowCreditCardForm(true); }} disabled={accounts.filter((a) => inferTipo(a) !== "Hotel").length === 0}><Plus size={15} /> Novo Crédito</button>
              </div>
              {(db.creditosCartao || []).length === 0 ? <div className="mk-empty">Nenhum crédito de cartão registrado ainda.</div> : (
                <div className="mk-table-wrap"><table className="mk-table"><thead><tr><th>Programa ou Co-Branded</th><th>Pontos por R$</th><th>Fatura do mês</th><th>Pontos acumulados</th><th></th></tr></thead><tbody>
                  {(db.creditosCartao || []).map((c) => { const conta = accounts.find((a) => a.id === c.programaId); return <tr key={c.id}><td>{conta?.programa || c.cartao || "—"}</td><td>{Number(c.pontosPorReal || 0).toLocaleString("pt-BR")}</td><td className="mk-negative">{formatNegativeBRL(c.faturaMes)}</td><td>{Number(c.pontosAcumulados || 0).toLocaleString("pt-BR")}</td><td><button className="mk-iconbtn" onClick={() => { setEditingCreditCard(c); setShowCreditCardForm(true); }} title="Editar"><Pencil size={14} /></button><button className="mk-iconbtn" onClick={() => removeCreditCard(c.id)} title="Excluir"><Trash2 size={14} /></button></td></tr>; })}
                </tbody></table></div>
              )}
            </>
          )}

          {activeModule && (
            <DataModule schema={activeModule} data={db[activeModule.key] || []} setData={updateSlice(activeModule.key)} allData={db} />
          )}
        </div>
      </div>

      {showAccountForm && <AccountFormModal initial={editingAccount} onClose={() => { setShowAccountForm(false); setEditingAccount(null); }} onSave={(d) => { editingAccount ? updateAccount(editingAccount.id, d) : addAccount(d); setShowAccountForm(false); setEditingAccount(null); }} />}
      {showEmissionForm && <EmissionFormModal initial={editingEmission} accounts={accounts} onClose={() => { setShowEmissionForm(false); setEditingEmission(null); }} onSave={(d) => { editingEmission ? updateEmission(editingEmission.id, d) : addEmission(d); setShowEmissionForm(false); setEditingEmission(null); }} />}
      {showTripForm && <TripFormModal initial={editingTrip} onClose={() => { setShowTripForm(false); setEditingTrip(null); }} onSave={(d) => { editingTrip ? updateTrip(editingTrip.id, d) : addTrip(d); setShowTripForm(false); setEditingTrip(null); }} />}
      {showHotelForm && <HotelReservationFormModal initial={editingHotel} accounts={accounts} onClose={() => { setShowHotelForm(false); setEditingHotel(null); }} onSave={(d) => { editingHotel ? updateHotelReservation(editingHotel.id, d) : addHotelReservation(d); setShowHotelForm(false); setEditingHotel(null); }} />}
      {showCreditCardForm && <CreditCardFormModal initial={editingCreditCard} accounts={accounts} onClose={() => { setShowCreditCardForm(false); setEditingCreditCard(null); }} onSave={(d) => { editingCreditCard ? updateCreditCard(editingCreditCard.id, d) : addCreditCard(d); setShowCreditCardForm(false); setEditingCreditCard(null); }} />}
      {showProfileForm && !impersonating && (
        <ProfileSettingsModal
          currentEmail={profile?.email || userEmail}
          onClose={() => setShowProfileForm(false)}
          onSaved={(email) => {
            setProfile((prev) => ({ ...(prev || {}), email: email || prev?.email }));
          }}
        />
      )}
    </div>
  );
}

function AccountFormModal({ initial, onClose, onSave }) {
  const initialTipo = initial ? inferTipo(initial) : "Aéreo";
  const initialIsCustom = initial && !MARCAS_POR_TIPO[initialTipo].includes(initial.programa);
  const [form, setForm] = useState({
    tipo: initialTipo,
    marca: initialIsCustom ? "Outro" : (initial?.programa || MARCAS_POR_TIPO[initialTipo][0]),
    outroTexto: initialIsCustom ? (initial?.programa || "") : "",
    titular: initial?.titular || "",
    saldo: initial?.saldo ?? "",
    cpm: initial?.cpm ?? "",
    validade: initial?.validade || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setTipo = (novoTipo) => setForm((f) => ({ ...f, tipo: novoTipo, marca: MARCAS_POR_TIPO[novoTipo][0], outroTexto: "" }));
  const isOutro = form.marca === "Outro";
  const programaFinal = isOutro ? form.outroTexto.trim() : form.marca;
  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>{initial ? "Editar programa" : "Novo programa"} <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>Tipo</label>
          <select value={form.tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS_PROGRAMA.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </div>
        <div className="mk-form-row"><label>Marca</label>
          <select value={form.marca} onChange={(e) => set("marca", e.target.value)}>{MARCAS_POR_TIPO[form.tipo].map((m) => <option key={m} value={m}>{m}</option>)}</select>
        </div>
        {isOutro && (
          <div className="mk-form-row"><label>Qual programa?</label><input value={form.outroTexto} onChange={(e) => set("outroTexto", e.target.value)} placeholder="Digite o nome do programa" /></div>
        )}
        <div className="mk-form-row"><label>Titular</label><input value={form.titular} onChange={(e) => set("titular", e.target.value)} placeholder="Nome do titular" /></div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Saldo</label><input type="number" value={form.saldo} onChange={(e) => set("saldo", e.target.value)} placeholder="50000" /></div>
          <div className="mk-form-row"><label>Custo/Milheiro (R$)</label><input type="number" step="0.01" value={form.cpm} onChange={(e) => set("cpm", e.target.value)} placeholder="18.50" /></div>
        </div>
        <div className="mk-form-row"><label>Validade</label><input type="date" value={form.validade} onChange={(e) => set("validade", e.target.value)} /></div>
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={!form.titular || !form.saldo || (isOutro && !form.outroTexto.trim())} onClick={() => onSave({ tipo: form.tipo, programa: programaFinal, titular: form.titular, saldo: form.saldo, cpm: form.cpm, validade: form.validade })}>{initial ? "Salvar alterações" : "Salvar programa"}</button>
      </div>
    </div>
  );
}


function TripFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ destino: initial?.destino || "", partida: initial?.partida || "", semData: !!initial?.semData, data: initial?.data || "", flexibilidade: String(initial?.flexibilidade ?? "0"), passageiros: String(initial?.passageiros ?? "1") });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.destino && form.partida && (form.semData || form.data);

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>{initial ? "Editar Viagem" : "Nova Viagem"} <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>Destino</label><input value={form.destino} onChange={(e) => set("destino", e.target.value)} placeholder="Ex.: Lisboa" /></div>
        <div className="mk-form-row"><label>Partida</label><input value={form.partida} onChange={(e) => set("partida", e.target.value)} placeholder="Ex.: Belo Horizonte" /></div>
        <label className="mk-check-row"><input type="checkbox" checked={form.semData} onChange={(e) => set("semData", e.target.checked)} /> Sem data definida</label>
        {!form.semData && (
          <>
            <div className="mk-form-row"><label>Data da viagem</label><input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></div>
            <div className="mk-form-row"><label>Flexibilidade</label>
              <select value={form.flexibilidade} onChange={(e) => set("flexibilidade", e.target.value)}>
                <option value="0">Sem flexibilidade</option>
                <option value="3">Flexibilidade +3</option>
                <option value="7">Flexibilidade +7</option>
              </select>
            </div>
          </>
        )}
        <div className="mk-form-row"><label>Número de passageiros</label>
          <select value={form.passageiros} onChange={(e) => set("passageiros", e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={!canSave} onClick={() => onSave({ ...form, data: form.semData ? "" : form.data, flexibilidade: form.semData ? "0" : form.flexibilidade })}>{initial ? "Salvar alterações" : "Salvar viagem"}</button>
      </div>
    </div>
  );
}

function EmissionFormModal({ initial, accounts, onClose, onSave }) {
  const eligibleAccounts = accounts.filter((a) => inferTipo(a) !== "Hotel");
  const [form, setForm] = useState({
    origemMilhas: initial?.origemMilhas || "saldo",
    accountId: initial?.accountId || eligibleAccounts[0]?.id || "",
    dataResgate: initial?.dataResgate || initial?.data || "",
    dataIda: initial?.dataIda || "",
    dataVolta: initial?.dataVolta || "",
    destino: initial?.destino || "",
    passageiros: String(initial?.passageiros ?? "1"),
    milhas: initial?.milhas ?? "",
    taxas: initial?.taxas ?? "",
    valorMercado: initial?.valorMercado ?? "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const conta = eligibleAccounts.find((a) => a.id === form.accountId);
  const cpm = conta ? Number(conta.cpm) : 0;
  const custoMilhas = (Number(form.milhas || 0) / 1000) * cpm;
  const custoTotal = custoMilhas + Number(form.taxas || 0);
  const economia = Number(form.valorMercado || 0) - custoTotal;
  const passageiros = Math.max(1, Number(form.passageiros || 1));
  const valorMercadoPorPassagem = Number(form.valorMercado || 0) / passageiros;
  const economiaPorPassagem = economia / passageiros;
  const custoPorPassagem = custoTotal / passageiros;
  const saldoDisponivel = Number(conta?.saldo || 0) + (initial?.saldoDebitado && initial?.accountId === form.accountId ? Number(initial?.milhas || 0) : 0);
  const saldoInsuficiente = form.origemMilhas === "saldo" && conta && Number(form.milhas || 0) > saldoDisponivel;

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>{initial ? "Editar emissão" : "Nova emissão"} <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>Origem das milhas</label><select value={form.origemMilhas} onChange={(e) => set("origemMilhas", e.target.value)}><option value="resgate">Resgate Anterior</option><option value="saldo">Saldo em Conta</option></select></div>
        <div className="mk-form-row"><label>Programa</label><select value={form.accountId} onChange={(e) => set("accountId", e.target.value)}>{eligibleAccounts.map((a) => <option key={a.id} value={a.id}>{a.programa} — saldo {Number(a.saldo || 0).toLocaleString("pt-BR")}</option>)}</select></div>
        <div className="mk-form-row"><label>Passageiros</label><select value={form.passageiros} onChange={(e) => set("passageiros", e.target.value)}>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        <div className="mk-form-row"><label>Data do Resgate</label><input type="date" value={form.dataResgate} onChange={(e) => set("dataResgate", e.target.value)} /></div>
        <div className="mk-form-row"><label>Embarque-Destino</label><input value={form.destino} onChange={(e) => set("destino", e.target.value)} placeholder="Ex.: CNF → LIS" /></div>
        <div className="mk-form-cols"><div className="mk-form-row"><label>Data da Ida</label><input type="date" value={form.dataIda} onChange={(e) => set("dataIda", e.target.value)} /></div><div className="mk-form-row"><label>Data da Volta</label><input type="date" value={form.dataVolta} onChange={(e) => set("dataVolta", e.target.value)} /></div></div>
        <div className="mk-form-cols"><div className="mk-form-row"><label>Milhas usadas</label><input type="number" value={form.milhas} onChange={(e) => set("milhas", e.target.value)} placeholder="80000" /></div><div className="mk-form-row"><label>Taxas pagas (R$)</label><input type="number" step="0.01" value={form.taxas} onChange={(e) => set("taxas", e.target.value)} placeholder="350" /></div></div>
        <div className="mk-form-row"><label>Valor de mercado total (R$)</label><input type="number" step="0.01" value={form.valorMercado} onChange={(e) => set("valorMercado", e.target.value)} placeholder="6200" /></div>
        {saldoInsuficiente && <div className="mk-preview" style={{ color: "#FF6B6B" }}>Saldo insuficiente nesse programa para debitar {Number(form.milhas || 0).toLocaleString("pt-BR")} milhas.</div>}
        {form.milhas && form.valorMercado && <div className="mk-preview">Custo total das milhas: <b className="mk-negative">{formatNegativeBRL(custoMilhas)}</b><br />Taxas totais: <b className="mk-negative">{formatNegativeBRL(form.taxas)}</b><br />Economia total: <span className="economia" style={{ color: economia >= 0 ? "#34C495" : "#FF6B6B" }}>{formatBRL(economia)}</span><br /><br /><b>Por passagem ({passageiros} passageiro{passageiros > 1 ? "s" : ""})</b><br />Valor estimado: <b>{formatBRL(valorMercadoPorPassagem)}</b><br />Custo estimado: <b className="mk-negative">{formatNegativeBRL(custoPorPassagem)}</b><br />Economia por passagem: <b style={{ color: economiaPorPassagem >= 0 ? "#34C495" : "#FF6B6B" }}>{formatBRL(economiaPorPassagem)}</b>{form.origemMilhas === "resgate" && <><br /><span className="mk-field">Resgate Anterior: o custo é calculado pelo milheiro do programa, mas o saldo não será debitado novamente.</span></>}</div>}
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={!form.accountId || !form.destino || !form.dataResgate || !form.dataIda || !form.milhas || !form.valorMercado || saldoInsuficiente} onClick={() => onSave({ ...form, passageiros })}>{initial ? "Salvar alterações" : "Salvar emissão"}</button>
      </div>
    </div>
  );
}

function HotelReservationFormModal({ initial, accounts, onClose, onSave }) {
  const eligibleAccounts = accounts;
  const initialIsResgate = initial?.origemMilhas === "resgate";
  const [form, setForm] = useState({
    hotel: initial?.hotel || initial?.destino || "",
    origemPrograma: initial ? (initialIsResgate ? "resgate" : initial.programaId) : (eligibleAccounts[0]?.id || "resgate"),
    programaResgateId: initial?.programaId || eligibleAccounts[0]?.id || "",
    pontosMilhas: initial?.pontosMilhas ?? "",
    valorMercado: initial?.valorMercado ?? "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isResgateAnterior = form.origemPrograma === "resgate";
  const programaId = isResgateAnterior ? form.programaResgateId : form.origemPrograma;
  const conta = eligibleAccounts.find((a) => a.id === programaId);
  const custoPontos = (Number(form.pontosMilhas || 0) / 1000) * Number(conta?.cpm || 0);
  const economia = Number(form.valorMercado || 0) - custoPontos;
  const saldoDisponivel = Number(conta?.saldo || 0) + (initial?.saldoDebitado && initial?.programaId === programaId ? Number(initial?.pontosMilhas || 0) : 0);
  const saldoInsuficiente = !isResgateAnterior && conta && Number(form.pontosMilhas || 0) > saldoDisponivel;

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{initial ? "Editar Reserva de Hotel" : "Nova Reserva de Hotel"} <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>Hotel</label><textarea rows="3" value={form.hotel} onChange={(e) => set("hotel", e.target.value)} placeholder="Descrição / comentário da reserva" /></div>
        <div className="mk-form-row">
          <label>Pontos/Milhas usadas</label>
          <select value={form.origemPrograma} onChange={(e) => set("origemPrograma", e.target.value)}>
            <option value="resgate">Resgate Anterior</option>
            {eligibleAccounts.map((a) => <option key={a.id} value={a.id}>{a.programa} — saldo {Number(a.saldo || 0).toLocaleString("pt-BR")}</option>)}
          </select>
          {isResgateAnterior && <select value={form.programaResgateId} onChange={(e) => set("programaResgateId", e.target.value)}><option value="">Programa usado no resgate anterior</option>{eligibleAccounts.map((a) => <option key={a.id} value={a.id}>{a.programa} — CPM {formatBRL(a.cpm)}</option>)}</select>}
          <input type="number" value={form.pontosMilhas} onChange={(e) => set("pontosMilhas", e.target.value)} placeholder="Quantidade de pontos/milhas" />
        </div>
        <div className="mk-form-row"><label>Valor de mercado (R$)</label><input type="number" step="0.01" value={form.valorMercado} onChange={(e) => set("valorMercado", e.target.value)} /></div>
        {saldoInsuficiente && <div className="mk-preview" style={{ color: "#FF6B6B" }}>Saldo insuficiente para esse resgate.</div>}
        {form.pontosMilhas && form.valorMercado && conta && <div className="mk-preview">Valor pago estimado pelo milheiro: <b className="mk-negative">{formatNegativeBRL(custoPontos)}</b><br />Economia: <span className="economia" style={{ color: economia >= 0 ? "#34C495" : "#FF6B6B" }}>{formatBRL(economia)}</span>{isResgateAnterior && <><br /><span className="mk-field">Resgate Anterior: o custo é calculado pelo milheiro do programa escolhido, mas o saldo não será debitado novamente.</span></>}</div>}
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={!form.hotel || !programaId || !form.pontosMilhas || !form.valorMercado || saldoInsuficiente} onClick={() => onSave({ hotel: form.hotel, origemMilhas: isResgateAnterior ? "resgate" : "saldo", programaId, pontosMilhas: form.pontosMilhas, valorMercado: form.valorMercado, cpmUsado: Number(conta?.cpm || 0) })}>{initial ? "Salvar alterações" : "Salvar reserva"}</button>
      </div>
    </div>
  );
}

function CreditCardFormModal({ initial, accounts, onClose, onSave }) {
  const eligibleAccounts = accounts.filter((a) => inferTipo(a) !== "Hotel");
  const [form, setForm] = useState({ programaId: initial?.programaId || eligibleAccounts[0]?.id || "", pontosPorReal: initial?.pontosPorReal ?? "", faturaMes: initial?.faturaMes ?? "", pontosAcumulados: initial?.pontosAcumulados ?? "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return <div className="mk-modal-backdrop" onClick={onClose}><div className="mk-modal" onClick={(e) => e.stopPropagation()}><h3>{initial ? "Editar Crédito de Cartão" : "Novo Crédito de Cartão"} <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
    <div className="mk-form-row"><label>Programa ou Co-Branded</label><select value={form.programaId} onChange={(e) => set("programaId", e.target.value)}>{eligibleAccounts.map((a) => <option key={a.id} value={a.id}>{a.programa} — {inferTipo(a)}</option>)}</select></div>
    <div className="mk-form-row"><label>Pontos por R$</label><input type="number" step="0.01" value={form.pontosPorReal} onChange={(e) => set("pontosPorReal", e.target.value)} /></div>
    <div className="mk-form-row"><label>Fatura do mês (R$)</label><input type="number" step="0.01" value={form.faturaMes} onChange={(e) => set("faturaMes", e.target.value)} /></div>
    <div className="mk-form-row"><label>Pontos acumulados</label><input type="number" value={form.pontosAcumulados} onChange={(e) => set("pontosAcumulados", e.target.value)} /></div>
    <div className="mk-preview">{initial ? "Ao salvar, o crédito anterior será revertido e o novo valor será aplicado ao programa selecionado." : <>Ao salvar, <b>{Number(form.pontosAcumulados || 0).toLocaleString("pt-BR")}</b> pontos serão somados automaticamente ao saldo do programa selecionado.</>}</div>
    <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={!form.programaId || !form.pontosAcumulados} onClick={() => onSave(form)}>{initial ? "Salvar alterações" : "Salvar crédito"}</button>
  </div></div>;
}

// ---------- Dashboard agregada do admin ----------
function AdminAggregateDashboard({ clients }) {
  const [loading, setLoading] = useState(true);
  const [agg, setAgg] = useState({ totalMilhas: 0, totalEconomia: 0, porCliente: [], viagens: [], proximasEmissoes: [], assinaturas: [], vencimentos: [] });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("app_data").select("user_id, data");
      if (error) { console.error(error); setLoading(false); return; }
      let totalMilhas = 0, totalEconomia = 0;
      const viagens = [];
      const proximasEmissoes = [];
      const assinaturas = [];
      const vencimentos = [];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limiteSeisMeses = new Date(hoje);
      limiteSeisMeses.setMonth(limiteSeisMeses.getMonth() + 6);

      const porCliente = (data || []).map((row) => {
        const d = row.data || {};
        const accs = d.accounts || [];
        const ems = d.emissions || [];
        const client = clients.find((c) => c.id === row.user_id);
        const nomeCliente = client?.nome || client?.email || "Cliente removido";
        const milhas = accs.reduce((sum, a) => sum + Number(a.saldo || 0), 0);
        const economiaEmissoes = ems.reduce((sum, e) => {
          const conta = accs.find((a) => a.id === e.accountId);
          const cpm = conta ? Number(conta.cpm) : 0;
          const custo = (Number(e.milhas) / 1000) * cpm + Number(e.taxas || 0);
          return sum + (Number(e.valorMercado || 0) - custo);
        }, 0);
        const economiaHoteis = (d.reservasHotel || []).reduce((sum, r) => {
          const conta = accs.find((a) => a.id === r.programaId);
          const cpm = conta ? Number(conta.cpm) : Number(r.cpmSnapshot || 0);
          const custo = (Number(r.pontosMilhas || 0) / 1000) * cpm;
          return sum + (Number(r.valorMercado || 0) - custo);
        }, 0);
        const economia = economiaEmissoes + economiaHoteis;

        (d.proximasViagens || []).forEach((v) => viagens.push({ ...v, userId: row.user_id, cliente: nomeCliente }));
        ems.forEach((e) => {
          if (!e.dataIda) return;
          const ida = new Date(`${e.dataIda}T00:00:00`);
          if (ida >= hoje) {
            const programa = accs.find((a) => a.id === e.accountId);
            proximasEmissoes.push({ ...e, userId: row.user_id, cliente: nomeCliente, programa: programa?.programa || "Programa removido" });
          }
        });
        (d.assinaturas || []).forEach((a) => {
          const programa = accs.find((acc) => acc.id === a.programaId);
          assinaturas.push({ ...a, userId: row.user_id, cliente: nomeCliente, programa: programa?.programa || "Programa removido" });
          if (a.vencimento) {
            const dt = new Date(`${a.vencimento}T00:00:00`);
            if (dt <= limiteSeisMeses) {
              vencimentos.push({ id: `ass-${row.user_id}-${a.id}`, cliente: nomeCliente, tipo: "Assinatura", item: programa?.programa || "Programa removido", data: a.vencimento, dias: Math.ceil((dt - hoje) / 86400000), descricao: a.descricao || "" });
            }
          }
        });
        accs.forEach((a) => {
          if (!a.validade) return;
          const dt = new Date(`${a.validade}T00:00:00`);
          if (dt <= limiteSeisMeses) {
            vencimentos.push({ id: `acc-${row.user_id}-${a.id}`, cliente: nomeCliente, tipo: inferTipo(a) === "Aéreo" ? "Milhas" : "Pontos", item: a.programa || "Programa", data: a.validade, dias: Math.ceil((dt - hoje) / 86400000), descricao: "" });
          }
        });

        totalMilhas += milhas;
        totalEconomia += economia;
        return { id: row.user_id, nome: nomeCliente, milhas, economia };
      }).filter((c) => c.milhas > 0 || c.economia !== 0).sort((a, b) => b.milhas - a.milhas);

      viagens.sort((a, b) => {
        if (a.semData && !b.semData) return 1;
        if (!a.semData && b.semData) return -1;
        return (a.data || "9999-12-31").localeCompare(b.data || "9999-12-31");
      });
      proximasEmissoes.sort((a, b) => (a.dataIda || "9999-12-31").localeCompare(b.dataIda || "9999-12-31"));
      assinaturas.sort((a, b) => (a.vencimento || "9999-12-31").localeCompare(b.vencimento || "9999-12-31"));
      vencimentos.sort((a, b) => (a.data || "9999-12-31").localeCompare(b.data || "9999-12-31"));
      setAgg({ totalMilhas, totalEconomia, porCliente, viagens, proximasEmissoes, assinaturas, vencimentos });
      setLoading(false);
    })();
  }, [clients]);

  const vencendoPlanos = clients.filter((c) => c.plano_fim).map((c) => ({ ...c, dias: Math.ceil((new Date(`${c.plano_fim}T00:00:00`) - new Date()) / 86400000) })).filter((c) => c.dias <= 30).sort((a, b) => a.dias - b.dias);
  const valorRecebidoPlanos = clients.reduce((sum, c) => sum + Number(c.plano_valor || 0), 0);

  return (
    <>
      <div className="mk-grid">
        <div className="mk-stub"><div className="mk-stub-label"><Users size={13} /> Clientes gerenciados</div><div className="mk-stub-value">{clients.length}</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><Wallet size={13} /> Milhas sob gestão</div><div className="mk-stub-value">{agg.totalMilhas.toLocaleString("pt-BR")}</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><TrendingUp size={13} /> Economia gerada (todos)</div><div className="mk-stub-value" style={{ color: agg.totalEconomia >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(agg.totalEconomia)}</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><DollarSign size={13} /> Valor recebido dos planos</div><div className="mk-stub-value" style={{ color: "var(--green)" }}>{formatBRL(valorRecebidoPlanos)}</div><div className="mk-stub-foot">Soma do valor dos planos cadastrados</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><CalendarClock size={13} /> Planos vencendo</div><div className="mk-stub-value">{vencendoPlanos.length || "—"}</div><div className="mk-stub-foot">{vencendoPlanos.length ? "nos próximos 30 dias" : "nenhum em breve"}</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><CalendarClock size={13} /> Vencimentos próximos</div><div className="mk-stub-value">{agg.vencimentos.length || "—"}</div><div className="mk-stub-foot">Assinaturas, milhas e pontos em até 6 meses</div></div>
      </div>

      <div className="mk-section-title"><h2>Vencimentos próximos — 6 meses</h2></div>
      {loading ? <div className="mk-empty">Carregando…</div> : agg.vencimentos.length === 0 ? (
        <div className="mk-empty">Nenhuma assinatura, milha ou ponto vencendo nos próximos 6 meses.</div>
      ) : (
        <div className="mk-table-wrap" style={{ marginBottom: 22 }}>
          <table className="mk-table">
            <thead><tr><th>Cliente</th><th>Tipo</th><th>Programa/Assinatura</th><th>Vencimento</th><th>Prazo</th><th>Descrição</th></tr></thead>
            <tbody>{agg.vencimentos.map((v) => (
              <tr key={v.id}>
                <td>{v.cliente}</td><td>{v.tipo}</td><td>{v.item}</td><td>{formatDate(v.data)}</td>
                <td style={{ color: v.dias < 0 ? "var(--red)" : v.dias <= 30 ? "#FFB020" : "var(--ink)" }}>{v.dias < 0 ? `Vencido há ${Math.abs(v.dias)} dia(s)` : `${v.dias} dia(s)`}</td>
                <td>{v.descricao || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="mk-section-title"><h2>Planejamento de Viagens</h2></div>
      {loading ? <div className="mk-empty">Carregando…</div> : agg.viagens.length === 0 ? (
        <div className="mk-empty">Nenhum planejamento de viagem cadastrado pelos clientes.</div>
      ) : (
        <div className="mk-table-wrap" style={{ marginBottom: 22 }}>
          <table className="mk-table">
            <thead><tr><th>Cliente</th><th>Destino</th><th>Partida</th><th>Data</th><th>Flexibilidade</th><th>Passageiros</th></tr></thead>
            <tbody>{agg.viagens.map((v) => (
              <tr key={`${v.userId}-${v.id}`}>
                <td>{v.cliente}</td><td>{v.destino}</td><td>{v.partida || "—"}</td>
                <td>{v.semData ? "Sem data definida" : formatDate(v.data)}</td>
                <td>{!v.semData && Number(v.flexibilidade) > 0 ? `+${v.flexibilidade} dias` : "—"}</td>
                <td>{Number(v.passageiros || 1)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="mk-stub" style={{ marginBottom: 22, paddingBottom: 16 }}>
        <div className="mk-section-title" style={{ marginBottom: 12 }}><h2>Próximas Viagens</h2></div>
        {loading ? <div className="mk-empty">Carregando…</div> : agg.proximasEmissoes.length === 0 ? (
          <div className="mk-empty">Nenhuma emissão com viagem futura cadastrada.</div>
        ) : (
          <div className="mk-table-wrap"><table className="mk-table"><thead><tr><th>Cliente</th><th>Embarque-Destino</th><th>Programa</th><th>Origem</th><th>Ida</th><th>Volta</th><th>Resgate</th><th>Passageiros</th><th>Milhas</th><th>Taxas</th></tr></thead><tbody>{agg.proximasEmissoes.map((e) => (
            <tr key={`${e.userId}-${e.id}`}><td>{e.cliente}</td><td>{e.destino}</td><td>{e.programa}</td><td>{e.origemMilhas === "saldo" ? "Saldo em Conta" : "Resgate Anterior"}</td><td>{formatDate(e.dataIda)}</td><td>{formatDate(e.dataVolta)}</td><td>{formatDate(e.dataResgate || e.data)}</td><td>{Number(e.passageiros || 1)}</td><td>{Number(e.milhas || 0).toLocaleString("pt-BR")}</td><td className="mk-negative">{formatNegativeBRL(e.taxas)}</td></tr>
          ))}</tbody></table></div>
        )}
      </div>

      <div className="mk-section-title"><h2>Assinaturas dos clientes</h2></div>
      {loading ? <div className="mk-empty">Carregando…</div> : agg.assinaturas.length === 0 ? (
        <div className="mk-empty">Nenhuma assinatura cadastrada pelos clientes.</div>
      ) : (
        <div className="mk-table-wrap" style={{ marginBottom: 22 }}>
          <table className="mk-table">
            <thead><tr><th>Cliente</th><th>Programa</th><th>Milhas/mês</th><th>Mensalidade</th><th>Tempo de assinatura</th><th>Início</th><th>Vencimento</th><th>Descrição</th></tr></thead>
            <tbody>{agg.assinaturas.map((a) => (
              <tr key={`${a.userId}-${a.id}`}>
                <td>{a.cliente}</td><td>{a.programa}</td><td>{Number(a.milhasMes || 0).toLocaleString("pt-BR")}</td>
                <td className="mk-negative">{formatNegativeBRL(a.valorMensal)}</td>
                <td>{elapsedSubscriptionLabel(a.inicio, a.vencimento)}</td><td>{formatDate(a.inicio)}</td><td>{formatDate(a.vencimento)}</td><td>{a.descricao || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="mk-section-title"><h2>Clientes por volume de milhas</h2></div>
      {loading ? (
        <div className="mk-empty">Carregando…</div>
      ) : agg.porCliente.length === 0 ? (
        <div className="mk-empty">Nenhum dado lançado pelos clientes ainda.</div>
      ) : (
        <div className="mk-table-wrap" style={{ marginBottom: 22 }}>
          <table className="mk-table">
            <thead><tr><th>Cliente</th><th>Milhas</th><th>Economia</th></tr></thead>
            <tbody>{agg.porCliente.map((c) => (
              <tr key={c.id}><td>{c.nome}</td><td>{c.milhas.toLocaleString("pt-BR")}</td><td style={{ color: c.economia >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(c.economia)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {vencendoPlanos.length > 0 && (
        <>
          <div className="mk-section-title"><h2>Planos vencendo</h2></div>
          <div className="mk-stub">{vencendoPlanos.map((c) => (
            <div className="mk-alert-row" key={c.id}><span>{c.nome || c.email}</span><span className="mk-mono" style={{ color: c.dias < 0 ? "var(--red)" : "var(--ink)" }}>{c.dias < 0 ? "vencido" : `${c.dias} dia(s)`}</span></div>
          ))}</div>
        </>
      )}
    </>
  );
}

// ---------- Cadastro/edição de cliente ----------
function ClienteFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    nome: initial?.nome || "", email: initial?.email || "", cpf: initial?.cpf || "",
    telefone: initial?.telefone || "", senha: "",
    planoValor: initial?.plano_valor || "", planoParcelas: initial?.plano_parcelas || "",
    planoInicio: initial?.plano_inicio || "", planoFim: initial?.plano_fim || "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      if (isEdit) {
        const emailMudou = form.email.trim().toLowerCase() !== (initial.email || "").trim().toLowerCase();
        if (emailMudou || form.senha) {
          const { data, error } = await supabase.functions.invoke("clever-service", {
            body: { action: "update_user", userId: initial.id, email: emailMudou ? form.email.trim() : undefined, password: form.senha || undefined },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
        }
        const { error } = await supabase.from("profiles").update({
          nome: form.nome, email: form.email.trim(), cpf: onlyDigits(form.cpf) || null, telefone: form.telefone || null,
          plano_valor: form.planoValor || null, plano_parcelas: form.planoParcelas || null,
          plano_inicio: form.planoInicio || null, plano_fim: form.planoFim || null,
        }).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.functions.invoke("clever-service", {
          body: {
            action: "create", email: form.email, password: form.senha, nome: form.nome,
            cpf: onlyDigits(form.cpf), telefone: form.telefone,
            planoValor: form.planoValor, planoParcelas: form.planoParcelas, planoInicio: form.planoInicio, planoFim: form.planoFim,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? "Editar cliente" : "Novo cliente"} <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>Nome</label><input value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
        <div className="mk-form-row"><label>E-mail (login)</label><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>CPF (login alternativo)</label><input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
          <div className="mk-form-row"><label>Telefone</label><input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
        </div>
        <div className="mk-form-row"><label>{isEdit ? "Nova senha (opcional)" : "Senha"}</label><input type="password" value={form.senha} onChange={(e) => set("senha", e.target.value)} minLength={6} placeholder={isEdit ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} /></div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Plano — valor pago (R$)</label><input type="number" step="0.01" value={form.planoValor} onChange={(e) => set("planoValor", e.target.value)} /></div>
          <div className="mk-form-row"><label>Parcelas</label><input type="number" min="1" step="1" value={form.planoParcelas} onChange={(e) => set("planoParcelas", e.target.value)} placeholder="1" /></div>
        </div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Início do plano</label><input type="date" value={form.planoInicio} onChange={(e) => set("planoInicio", e.target.value)} /></div>
          <div className="mk-form-row"><label>Fim do plano</label><input type="date" value={form.planoFim} onChange={(e) => set("planoFim", e.target.value)} /></div>
        </div>
        {err && <div className="mk-preview" style={{ color: "#FF6B6B" }}>{err}</div>}
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={loading || !form.nome || !form.email || (!isEdit && form.senha.length < 6) || (isEdit && form.senha && form.senha.length < 6)} onClick={submit}>
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function ResetPasswordModal({ client, onClose }) {
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setLoading(true); setErr("");
    const { data, error } = await supabase.functions.invoke("clever-service", { body: { action: "reset_password", userId: client.id, password: senha } });
    setLoading(false);
    if (error || data?.error) { setErr(error?.message || data?.error || "Erro ao redefinir senha"); return; }
    setOk(true);
  };

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <h3>Redefinir senha <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-field" style={{ marginBottom: 10 }}>Cliente: <b>{client.email}</b></div>
        {ok ? (
          <div className="mk-preview">Senha alterada com sucesso.</div>
        ) : (
          <>
            <div className="mk-form-row"><label>Nova senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} /></div>
            {err && <div className="mk-preview" style={{ color: "#FF6B6B" }}>{err}</div>}
            <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={loading || senha.length < 6} onClick={submit}>{loading ? "Aguarde..." : "Salvar nova senha"}</button>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileSettingsModal({ currentEmail, onClose, onSaved }) {
  const [email, setEmail] = useState(currentEmail || "");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr(""); setMsg("");
    if (senha && senha.length < 6) { setErr("A nova senha deve ter pelo menos 6 caracteres."); return; }
    if (senha && senha !== confirmarSenha) { setErr("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) throw new Error("Usuário não encontrado.");
      const attrs = {};
      const emailMudou = email.trim().toLowerCase() !== (currentUser.email || "").trim().toLowerCase();
      if (emailMudou) attrs.email = email.trim();
      if (senha) attrs.password = senha;
      if (Object.keys(attrs).length === 0) { setMsg("Nenhuma alteração para salvar."); setLoading(false); return; }

      const { data, error } = await supabase.auth.updateUser(attrs);
      if (error) throw error;

      const emailAtualAuth = data?.user?.email || currentUser.email;
      if (!emailMudou || emailAtualAuth?.toLowerCase() === email.trim().toLowerCase()) {
        const { error: profileErr } = await supabase.from("profiles").update({ email: emailAtualAuth }).eq("id", currentUser.id);
        if (profileErr) console.error(profileErr);
      }
      setSenha(""); setConfirmarSenha("");
      setMsg(emailMudou && emailAtualAuth?.toLowerCase() !== email.trim().toLowerCase()
        ? "Alteração solicitada. Confirme o novo e-mail na mensagem enviada pelo Supabase. A senha, se informada, já foi atualizada."
        : "Perfil atualizado com sucesso.");
      onSaved?.(emailAtualAuth);
    } catch (e) {
      setErr(e.message || "Erro ao atualizar o perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3>Meu perfil <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>E-mail de login</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="mk-form-row"><label>Nova senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Deixe em branco para manter" minLength={6} /></div>
        {senha && <div className="mk-form-row"><label>Confirmar nova senha</label><input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} minLength={6} /></div>}
        {err && <div className="mk-preview" style={{ color: "#FF6B6B" }}>{err}</div>}
        {msg && <div className="mk-preview" style={{ color: "var(--green)" }}>{msg}</div>}
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={loading || !email} onClick={submit}>{loading ? "Salvando..." : "Salvar alterações"}</button>
      </div>
    </div>
  );
}

// ---------- Contas Gerenciadas (só admin) ----------
function ClientesManager({ clients, onChanged, onView }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  const planoStatus = (c) => {
    if (!c.plano_fim) return null;
    const dias = Math.ceil((new Date(c.plano_fim) - new Date()) / 86400000);
    if (dias < 0) return { label: "Vencido", color: "#FF6B6B" };
    if (dias <= 7) return { label: `${dias} dia(s)`, color: "#FFB020" };
    return { label: "Ativo", color: "#34C495" };
  };

  return (
    <>
      <div className="mk-section-title">
        <h2>Contas Gerenciadas</h2>
        <button className="mk-btn" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Novo cliente</button>
      </div>
      {clients.length === 0 ? (
        <div className="mk-empty">Nenhum cliente cadastrado ainda. Clique em "Novo cliente" para criar o primeiro login.</div>
      ) : (
        <div className="mk-table-wrap">
          <table className="mk-table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>CPF</th><th>Plano</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {clients.map((c) => {
                const st = planoStatus(c);
                return (
                  <tr key={c.id}>
                    <td>{c.nome || "—"}</td>
                    <td>{c.email}</td>
                    <td>{maskCpf(c.cpf)}</td>
                    <td>{c.plano_valor ? formatBRL(c.plano_valor) : "—"}{c.plano_parcelas ? ` em ${c.plano_parcelas}x` : ""}{c.plano_fim ? ` · até ${formatDate(c.plano_fim)}` : ""}</td>
                    <td>{st ? <span className="mk-badge" style={{ background: st.color, color: "#06122B" }}>{st.label}</span> : "—"}</td>
                    <td>
                      <button className="mk-iconbtn" onClick={() => onView(c)} title="Ver painel"><Eye size={14} /></button>
                      <button className="mk-iconbtn" onClick={() => { setEditing(c); setShowForm(true); }} title="Editar"><Pencil size={14} /></button>
                      <button className="mk-iconbtn" onClick={() => setResetting(c)} title="Redefinir senha"><KeyRound size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showForm && <ClienteFormModal initial={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={onChanged} />}
      {resetting && <ResetPasswordModal client={resetting} onClose={() => setResetting(null)} />}
    </>
  );
}

// ---------- Shell do admin: dashboard agregada + gestão de clientes + troca de usuário ----------
function AdminShell({ adminEmail, onSignOut }) {
  const [tab, setTab] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [viewingClient, setViewingClient] = useState(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [showProfileForm, setShowProfileForm] = useState(false);

  const loadClients = () => {
    supabase.from("profiles").select("*").eq("is_admin", false).order("nome").then(({ data, error }) => {
      if (error) console.error(error);
      setClients(data || []);
    });
  };
  useEffect(loadClients, []);
  useEffect(() => {
    supabase.from("profiles").select("nome").eq("email", adminEmail).maybeSingle().then(({ data }) => setAdminName(data?.nome || ""));
  }, [adminEmail]);

  if (viewingClient) {
    return (
      <PainelMilhas
        userId={viewingClient.id}
        userEmail={viewingClient.email}
        onSignOut={onSignOut}
        impersonating={{ nome: viewingClient.nome || viewingClient.email, onExit: () => setViewingClient(null) }}
      />
    );
  }

  return (
    <div className="mk-root">
      <style>{APP_CSS}</style>
      <div className="mk-app">
        {sidebarOpen && <div className="mk-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <div className={`mk-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="mk-sidebar-brand">
            <div className="mk-logo-badge"><Plane size={17} strokeWidth={2.2} /></div>
            <div><div className="sub">Arduini</div><div className="name">Viaja que rola</div></div>
            <button className="mk-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>
          <div className="mk-navlist">
            <button className={`mk-navitem ${tab === "dashboard" ? "active" : ""}`} onClick={() => { setTab("dashboard"); setSidebarOpen(false); }}><LayoutDashboard size={15} /> Dashboard</button>
            <button className={`mk-navitem ${tab === "clientes" ? "active" : ""}`} onClick={() => { setTab("clientes"); setSidebarOpen(false); }}><Users size={15} /> Contas Gerenciadas</button>
          </div>
          <div className="mk-signout-wrap">
            <div className="mk-field" style={{ marginBottom: 6 }}>{adminEmail} <span className="mk-badge" style={{ marginLeft: 6 }}>admin</span></div>
            <button className="mk-navitem" onClick={onSignOut}>Sair</button>
          </div>
        </div>

        <div className="mk-main">
          <div className="mk-topbar">
            <div className="mk-topbar-left">
              <button className="mk-menu-toggle" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>
              <h2>{tab === "dashboard" ? "Dashboard" : "Contas Gerenciadas"}</h2>
            </div>
            <div style={{ position: "relative" }}>
              <button className="mk-userpill" style={{ cursor: "pointer" }} onClick={() => setSwitcherOpen((s) => !s)}>
                <User size={14} /> <span className="mk-userpill-text">{adminName || adminEmail}</span> <ChevronDown size={14} />
              </button>
              {switcherOpen && (
                <div className="mk-switcher">
                  <button className="mk-switcher-item" onClick={() => { setShowProfileForm(true); setSwitcherOpen(false); }}><Pencil size={13} style={{ marginRight: 7, verticalAlign: -2 }} /> Meu perfil</button>
                  <div className="mk-switcher-label">Ver como cliente</div>
                  {clients.length === 0 ? (
                    <div className="mk-field" style={{ padding: "8px 12px" }}>Nenhum cliente ainda</div>
                  ) : clients.map((c) => (
                    <button key={c.id} className="mk-switcher-item" onClick={() => { setViewingClient(c); setSwitcherOpen(false); }}>{c.nome || c.email}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {tab === "dashboard" && <AdminAggregateDashboard clients={clients} />}
          {tab === "clientes" && <ClientesManager clients={clients} onChanged={loadClients} onView={(c) => setViewingClient(c)} />}
        </div>
      </div>
      {showProfileForm && <ProfileSettingsModal currentEmail={adminEmail} onClose={() => setShowProfileForm(false)} onSaved={() => {}} />}
    </div>
  );
}

// ---------- Login (e-mail ou CPF) ----------
function LoginScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    let email = login.trim();
    if (!email.includes("@")) {
      const { data: resolvedEmail, error: lookupErr } = await supabase.rpc("email_for_cpf", { cpf_input: onlyDigits(login) });
      if (lookupErr || !resolvedEmail) {
        setLoading(false);
        setMsg("CPF não encontrado. Confira com o administrador.");
        return;
      }
      email = resolvedEmail;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg("E-mail/CPF ou senha incorretos.");
  };

  return (
    <div className="mk-login-wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Space+Grotesk:wght@400;500;600&display=swap');
        .mk-login-wrap { --card:#0F2049; --accent:#2E6FF2; --accent-2:#5ED0FF; --ink:#EAF1FF; --muted:#8CA2C9; color-scheme:dark; font-family:'Space Grotesk',sans-serif; color: var(--ink); position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #050912; padding: 20px; }
        .mk-login-bgimg { position: absolute; inset: 0; background-image: url('/login-bg.jpg'); background-size: cover; background-position: center 18%; z-index: 0; }
        .mk-login-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,9,18,0.35) 0%, rgba(5,9,18,0.55) 45%, rgba(5,9,18,0.88) 100%), radial-gradient(circle at 85% 25%, rgba(46,111,242,0.12), transparent 55%); z-index: 1; }
        .mk-login-card { position: relative; z-index: 2; background: rgba(15,32,73,0.72); backdrop-filter: blur(6px); border: 1px solid rgba(94,208,255,0.22); border-radius: 14px; padding: 32px; width: 100%; max-width: 360px; box-shadow: 0 20px 60px rgba(0,0,0,0.55); }
        .mk-login-card h1 { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px; margin: 4px 0 4px; background: linear-gradient(90deg, var(--ink), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .mk-login-card p { color: var(--muted); font-size: 13px; margin: 0 0 20px; }
        .mk-login-card input { width: 100%; border: 1px solid rgba(234,241,255,0.18); border-radius: 8px; padding: 10px 12px; font-size: 14px; background: rgba(234,241,255,0.08); color: var(--ink); margin-bottom: 12px; font-family: 'Space Grotesk', sans-serif; }
        .mk-login-card button[type=submit] { width: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); color: #06122B; border: none; padding: 11px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .mk-login-card .msg { margin-top: 12px; font-size: 12.5px; color: var(--accent-2); }
        @media (max-width: 640px) {
          .mk-login-bgimg { background-position: center 12%; }
          .mk-login-card { padding: 26px 22px; }
        }
      `}</style>
      <div className="mk-login-bgimg" />
      <div className="mk-login-overlay" />
      <div className="mk-login-card">
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent-2)" }}>Arduini</div>
        <h1>Viaja que rola</h1>
        <p>Entre com seu e-mail ou CPF cadastrado pelo administrador.</p>
        <form onSubmit={submit}>
          <input type="text" placeholder="E-mail ou CPF" value={login} onChange={(e) => setLogin(e.target.value)} required />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit" disabled={loading}>{loading ? "Aguarde..." : "Entrar"}</button>
        </form>
        {msg && <div className="msg">{msg}</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle().then(({ data }) => {
      setIsAdmin(!!data?.is_admin);
    });
  }, [session]);

  if (session === undefined) {
    return <div style={{ background: "#050912", minHeight: "100vh", color: "#8CA2C9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Carregando…</div>;
  }
  if (!session) return <LoginScreen />;

  if (isAdmin) {
    return <AdminShell adminEmail={session.user.email} onSignOut={() => supabase.auth.signOut()} />;
  }

  return (
    <PainelMilhas
      userId={session.user.id}
      userEmail={session.user.email}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
