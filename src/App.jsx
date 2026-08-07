import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  Plane, Wallet, TrendingUp, Eye, EyeOff, Plus, Trash2, CalendarClock, X, Award,
  LayoutDashboard, Users, Layers, PlaneTakeoff, CreditCard, User, CalendarCheck,
  Gift, ShoppingCart, BadgePercent, ArrowLeftRight, DollarSign, Ticket, ShieldCheck,
  Pencil, ChevronDown, ArrowLeft, KeyRound, Menu
} from "lucide-react";

const PROGRAMAS = ["Smiles", "LATAM Pass", "Azul", "Livelo", "Esfera", "Iberia", "Accor", "Outro"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const onlyDigits = (s) => (s || "").replace(/\D/g, "");
const formatBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const maskCpf = (cpf) => { if (!cpf) return "—"; const d = onlyDigits(cpf); if (d.length < 11) return cpf; return `***.${d.slice(3, 6)}.***-${d.slice(9, 11)}`; };

const PROGRAM_COLORS = {
  smiles: "#FF7A00", "latam pass": "#7B2D8E", latam: "#7B2D8E", tudoazul: "#0039A6", azul: "#0039A6",
  livelo: "#E4007C", esfera: "#6B7280", accor: "#151515", iberia: "#C6007E",
};
function colorForPrograma(nome) {
  const key = (nome || "").toLowerCase();
  for (const k in PROGRAM_COLORS) if (key.includes(k)) return PROGRAM_COLORS[k];
  return "#2E6FF2";
}

// ---------- Config-driven modules (sidebar items reproduzidos genericamente) ----------
const MODULES = [
  { key: "programas", label: "Programas", icon: Layers, fields: [
      { key: "nome", label: "Nome", type: "text" },
      { key: "tipo", label: "Tipo", type: "select", options: ["Aéreo", "Hotel", "Cartão", "Bancário"] },
      { key: "limiteCpfs", label: "Limite de CPFs", type: "number" },
  ]},
  { key: "assinaturas", label: "Assinaturas", icon: CreditCard, fields: [
      { key: "nome", label: "Assinatura", type: "text" },
      { key: "programaId", label: "Programa", type: "relation", relationTo: "programas", labelField: "nome" },
      { key: "valorMensal", label: "Valor mensal", type: "currency" },
      { key: "vencimento", label: "Vencimento", type: "date" },
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
      { key: "programaId", label: "Programa", type: "relation", relationTo: "programas", labelField: "nome" },
      { key: "pontos", label: "Pontos comprados", type: "number" },
      { key: "bonusPct", label: "Bônus (%)", type: "number" },
      { key: "valorPago", label: "Valor pago", type: "currency" },
      { key: "data", label: "Data", type: "date" },
  ]},
  { key: "compraDePontos", label: "Compra de Pontos", icon: ShoppingCart, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "programas", labelField: "nome" },
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
      { key: "origemId", label: "Origem", type: "relation", relationTo: "programas", labelField: "nome" },
      { key: "destinoId", label: "Destino", type: "relation", relationTo: "programas", labelField: "nome" },
      { key: "pontos", label: "Pontos transferidos", type: "number" },
      { key: "bonusPct", label: "Bônus (%)", type: "number" },
      { key: "data", label: "Data", type: "date" },
  ]},
  { key: "vendasDeMilhas", label: "Vendas de Milhas", icon: DollarSign, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "programas", labelField: "nome" },
      { key: "milhas", label: "Milhas vendidas", type: "number" },
      { key: "valorVenda", label: "Valor da venda", type: "currency" },
      { key: "comprador", label: "Comprador", type: "text" },
      { key: "data", label: "Data", type: "date" },
  ]},
  { key: "resgates", label: "Resgates", icon: Ticket, fields: [
      { key: "programaId", label: "Programa", type: "relation", relationTo: "programas", labelField: "nome" },
      { key: "milhas", label: "Milhas usadas", type: "number" },
      { key: "descricao", label: "Resgate", type: "text" },
      { key: "valorEconomizado", label: "Economia", type: "currency" },
      { key: "data", label: "Data", type: "date" },
  ]},
];

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "programas", label: "Programas", icon: Layers },
  { key: "contas", label: "Contas", icon: Wallet },
  { key: "emissoes", label: "Emissões", icon: PlaneTakeoff },
  { key: "assinaturas", label: "Assinaturas", icon: CreditCard },
  { key: "passageiros", label: "Passageiros", icon: User },
  { key: "reservas", label: "Reservas", icon: CalendarCheck },
  { key: "comprasBonificadas", label: "Compras Bonificadas", icon: Gift },
  { key: "compraDePontos", label: "Compra de Pontos", icon: ShoppingCart },
  { key: "creditosCartao", label: "Créditos de Cartão", icon: BadgePercent },
  { key: "transferencias", label: "Transferências", icon: ArrowLeftRight },
  { key: "vendasDeMilhas", label: "Vendas de Milhas", icon: DollarSign },
  { key: "resgates", label: "Resgates", icon: Ticket },
  { key: "cpfs", label: "Controle de CPFs", icon: ShieldCheck },
];

const EMPTY_DB = { accounts: [], emissions: [], programas: [], assinaturas: [], passageiros: [], reservas: [], comprasBonificadas: [], compraDePontos: [], creditosCartao: [], transferencias: [], vendasDeMilhas: [], resgates: [] };

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
    color: var(--ink); min-height: 100%; box-sizing: border-box; border-radius: 16px; overflow: hidden;
  }
  .mk-root * { box-sizing: border-box; }
  .mk-mono { font-family: 'IBM Plex Mono', monospace; }
  .mk-display { font-family: 'Sora', sans-serif; font-weight: 800; letter-spacing: -0.3px; }
  .mk-app { display: flex; align-items: stretch; min-height: 100%; }
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
  if (field.type === "currency") return formatBRL(v);
  if (field.type === "date") return formatDate(v);
  if (field.type === "number") return (Number(v) || 0).toLocaleString("pt-BR");
  return v || "—";
}

function DataModule({ schema, data, setData, allData }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const save = (values) => {
    if (editing) setData((prev) => prev.map((d) => (d.id === editing.id ? { ...values, id: editing.id } : d)));
    else setData((prev) => [...prev, { ...values, id: uid() }]);
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => setData((prev) => prev.filter((d) => d.id !== id));

  return (
    <>
      <div className="mk-section-title">
        <h2>{schema.label}</h2>
        <button className="mk-btn" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Nova entrada</button>
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
  const requiredOk = schema.fields.filter((f) => f.type === "text").every((f) => !!form[f.key]) || schema.fields.every((f) => f.type !== "text");

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("app_data").select("data").eq("user_id", userId).maybeSingle();
      if (error) console.error(error);
      setDb(data ? { ...EMPTY_DB, ...data.data } : EMPTY_DB);
    })();
    supabase.from("profiles").select("plano_valor, plano_parcelas, plano_inicio, plano_fim").eq("id", userId).maybeSingle().then(({ data }) => {
      setProfile(data || {});
    });
  }, [userId]);

  useEffect(() => {
    if (!db) return;
    const timeout = setTimeout(() => {
      supabase.from("app_data").upsert({ user_id: userId, data: db, updated_at: new Date().toISOString() }).then(({ error }) => {
        if (error) console.error(error);
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [db, userId]);

  const updateSlice = (key) => (updater) =>
    setDb((prev) => ({ ...prev, [key]: typeof updater === "function" ? updater(prev[key]) : updater }));

  const accounts = db?.accounts || [], emissions = db?.emissions || [];
  const setAccounts = updateSlice("accounts"), setEmissions = updateSlice("emissions");

  const emissionsCalc = useMemo(() => emissions.map((em) => {
    const conta = accounts.find((a) => a.id === em.accountId);
    const cpm = conta ? Number(conta.cpm) : 0;
    const custoMilhas = (Number(em.milhas) / 1000) * cpm;
    const custoTotal = custoMilhas + Number(em.taxas || 0);
    const economia = Number(em.valorMercado || 0) - custoTotal;
    const pct = em.valorMercado ? (economia / Number(em.valorMercado)) * 100 : 0;
    return { ...em, conta, custoMilhas, custoTotal, economia, pct };
  }).sort((a, b) => (b.data || "").localeCompare(a.data || "")), [emissions, accounts]);

  const reservasCalc = useMemo(() => (db?.reservas || []).map((r) => ({
    ...r, economia: Number(r.valorMercado || 0) - Number(r.valorPago || 0),
  })), [db]);

  const totals = useMemo(() => {
    const totalMilhas = accounts.reduce((s, a) => s + Number(a.saldo || 0), 0);
    const patrimonio = accounts.reduce((s, a) => s + (Number(a.saldo || 0) / 1000) * Number(a.cpm || 0), 0);
    const economiaEmissoes = emissionsCalc.reduce((s, e) => s + e.economia, 0);
    const economiaReservas = reservasCalc.reduce((s, r) => s + r.economia, 0);
    const vencendo = accounts.filter((a) => a.validade).map((a) => ({ ...a, dias: Math.ceil((new Date(a.validade) - new Date()) / 86400000) })).filter((a) => a.dias <= 60).sort((a, b) => a.dias - b.dias);
    const custoPlano = Number(profile?.plano_valor || 0);
    const custoAssinaturas = (db?.assinaturas || []).reduce((s, a) => s + Number(a.valorMensal || 0), 0);
    const custoCompras = (db?.compraDePontos || []).reduce((s, c) => s + Number(c.valorPago || 0), 0)
      + (db?.comprasBonificadas || []).reduce((s, c) => s + Number(c.valorPago || 0), 0);
    const custoTotal = custoPlano + custoAssinaturas + custoCompras;
    return { totalMilhas, patrimonio, economiaEmissoes, economiaReservas, vencendo, custoPlano, custoAssinaturas, custoCompras, custoTotal };
  }, [accounts, emissionsCalc, reservasCalc, profile, db]);

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
    return Object.values(map).map((p) => {
      const progRecord = (db?.programas || []).find((pr) => (pr.nome || "").toLowerCase() === p.programa.toLowerCase());
      return {
        ...p,
        cpmAvg: p.cpmCount ? p.cpmSum / p.cpmCount : 0,
        cpfCount: p.cpfs.size,
        limiteCpfs: progRecord?.limiteCpfs ? Number(progRecord.limiteCpfs) : null,
      };
    }).sort((a, b) => b.saldo - a.saldo);
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
  const removeAccount = (id) => { setAccounts((prev) => prev.filter((a) => a.id !== id)); setEmissions((prev) => prev.filter((e) => e.accountId !== id)); };
  const addEmission = (data) => setEmissions((prev) => [...prev, { id: uid(), ...data }]);
  const removeEmission = (id) => setEmissions((prev) => prev.filter((e) => e.id !== id));

  const activeModule = MODULES.find((m) => m.key === tab);
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
            <div className="mk-userpill"><User size={14} /> <span className="mk-userpill-text">{userEmail}</span></div>
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
                  <div className="mk-stub-label"><Wallet size={13} /> Saldo total de pontos</div>
                  <div className="mk-stub-value">{totals.totalMilhas.toLocaleString("pt-BR")}</div>
                  <div className="mk-stub-foot">Em {accounts.length} conta(s) diferentes</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><Award size={13} /> Patrimônio em milhas</div>
                  <div className="mk-stub-value">{formatBRL(totals.patrimonio)}</div>
                  <div className="mk-stub-foot">Valor estimado das suas milhas</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><TrendingUp size={13} /> Economia em emissões</div>
                  <div className="mk-stub-value" style={{ color: totals.economiaEmissoes >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(totals.economiaEmissoes)}</div>
                  <div className="mk-stub-foot">{emissionsCalc.length} emissão(ões)</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><CalendarCheck size={13} /> Economia em reservas</div>
                  <div className="mk-stub-value" style={{ color: totals.economiaReservas >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(totals.economiaReservas)}</div>
                  <div className="mk-stub-foot">{(db.reservas || []).length} reserva(s)</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><CalendarClock size={13} /> Pontos a vencer</div>
                  <div className="mk-stub-value">{totals.vencendo.length || "—"}</div>
                  <div className="mk-stub-foot">{totals.vencendo.length ? "nos próximos 60 dias" : "nenhum ponto a vencer em breve"}</div>
                </div>
                <div className="mk-stub">
                  <div className="mk-stub-label"><Wallet size={13} /> Custo Total</div>
                  <div className="mk-stub-value">{formatBRL(totals.custoTotal)}</div>
                  <div className="mk-stub-foot">
                    Plano {formatBRL(totals.custoPlano)}{profile?.plano_parcelas ? ` (${profile.plano_parcelas}x)` : ""} · Assinaturas {formatBRL(totals.custoAssinaturas)} · Compras {formatBRL(totals.custoCompras)}
                  </div>
                </div>
              </div>

              <div className="mk-section-title"><h2>Visão Geral das Contas</h2></div>
              {porProgramaCards.length === 0 ? (
                <div className="mk-empty">Nenhuma conta cadastrada ainda. Vá em "Contas" para começar.</div>
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
                      {p.limiteCpfs && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
                            <span>CPFs</span>
                            <span className="mk-badge" style={{ background: p.cpfCount >= p.limiteCpfs ? "linear-gradient(90deg,#FF6B6B,#FF9B6B)" : "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>
                              {p.cpfCount >= p.limiteCpfs ? "Cheio" : "Ok"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, marginTop: 4 }}>{p.cpfCount} de {p.limiteCpfs}</div>
                          <div className="mk-progress-track"><div className="mk-progress-fill" style={{ width: `${Math.min(100, (p.cpfCount / p.limiteCpfs) * 100)}%` }} /></div>
                        </div>
                      )}
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

          {tab === "contas" && (
            <>
              <div className="mk-section-title">
                <h2>Contas de milhas</h2>
                <button className="mk-btn" onClick={() => setShowAccountForm(true)}><Plus size={15} /> Nova conta</button>
              </div>
              {accounts.length === 0 ? (
                <div className="mk-empty">Nenhuma conta cadastrada. Clique em "Nova conta" para registrar seu primeiro CPF.</div>
              ) : (
                <div className="mk-card-list">
                  {accounts.map((a) => (
                    <div className="mk-ticket" key={a.id}>
                      <div className="mk-ticket-main">
                        <div className="mk-ticket-row">
                          <span className="mk-ticket-title"><Plane size={15} /> {a.programa}<span className="mk-badge">{a.titular}</span></span>
                          <button className="mk-iconbtn" onClick={() => removeAccount(a.id)}><Trash2 size={15} /></button>
                        </div>
                        <div className="mk-field" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                          CPF: <b>{showCpf[a.id] ? a.cpf : maskCpf(a.cpf)}</b>
                          <button className="mk-eyebtn" onClick={() => setShowCpf((s) => ({ ...s, [a.id]: !s[a.id] }))}>{showCpf[a.id] ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                        </div>
                        <div className="mk-field">Custo médio: <b>{formatBRL(a.cpm)} / milheiro</b></div>
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

          {tab === "emissoes" && (
            <>
              <div className="mk-section-title">
                <h2>Emissões</h2>
                <button className="mk-btn" onClick={() => setShowEmissionForm(true)} disabled={accounts.length === 0}><Plus size={15} /> Nova emissão</button>
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
                          <button className="mk-iconbtn" onClick={() => removeEmission(e.id)}><Trash2 size={15} /></button>
                        </div>
                        <div className="mk-field">{formatDate(e.data)} · {Number(e.milhas).toLocaleString("pt-BR")} milhas · taxas {formatBRL(e.taxas)}</div>
                        <div className="mk-field">Custo estimado: <b>{formatBRL(e.custoTotal)}</b> · Valor de mercado: <b>{formatBRL(e.valorMercado)}</b></div>
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

          {tab === "cpfs" && (
            <>
              <div className="mk-section-title"><h2>Controle de CPFs</h2></div>
              {cpfGroups.length === 0 ? (
                <div className="mk-empty">Nenhum CPF registrado ainda — cadastre contas em "Contas" para vê-los aqui.</div>
              ) : (
                <div className="mk-table-wrap">
                  <table className="mk-table">
                    <thead><tr><th>CPF</th><th>Titular</th><th>Contas</th><th>Programas</th><th>Saldo total</th><th>Próxima validade</th></tr></thead>
                    <tbody>
                      {cpfGroups.map((g) => {
                        const saldoTotal = g.contas.reduce((s, c) => s + Number(c.saldo || 0), 0);
                        const validades = g.contas.filter((c) => c.validade).map((c) => c.validade).sort();
                        return (
                          <tr key={g.cpf}>
                            <td>{showCpf[g.cpf] ? g.cpf : maskCpf(g.cpf)} <button className="mk-eyebtn" onClick={() => setShowCpf((s) => ({ ...s, [g.cpf]: !s[g.cpf] }))}>{showCpf[g.cpf] ? <EyeOff size={12} /> : <Eye size={12} />}</button></td>
                            <td>{g.titular}</td>
                            <td>{g.contas.length}</td>
                            <td>{[...new Set(g.contas.map((c) => c.programa))].join(", ")}</td>
                            <td>{saldoTotal.toLocaleString("pt-BR")}</td>
                            <td>{validades[0] ? formatDate(validades[0]) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeModule && (
            <DataModule schema={activeModule} data={db[activeModule.key] || []} setData={updateSlice(activeModule.key)} allData={db} />
          )}
        </div>
      </div>

      {showAccountForm && <AccountFormModal onClose={() => setShowAccountForm(false)} onSave={(d) => { addAccount(d); setShowAccountForm(false); }} />}
      {showEmissionForm && <EmissionFormModal accounts={accounts} onClose={() => setShowEmissionForm(false)} onSave={(d) => { addEmission(d); setShowEmissionForm(false); }} />}
    </div>
  );
}

function AccountFormModal({ onClose, onSave }) {
  const [form, setForm] = useState({ programa: PROGRAMAS[0], titular: "", cpf: "", saldo: "", cpm: "", validade: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>Nova conta <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>Programa</label>
          <select value={form.programa} onChange={(e) => set("programa", e.target.value)}>{PROGRAMAS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        </div>
        <div className="mk-form-row"><label>Titular</label><input value={form.titular} onChange={(e) => set("titular", e.target.value)} placeholder="Nome do titular" /></div>
        <div className="mk-form-row"><label>CPF</label><input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Saldo (milhas)</label><input type="number" value={form.saldo} onChange={(e) => set("saldo", e.target.value)} placeholder="50000" /></div>
          <div className="mk-form-row"><label>Custo / milheiro (R$)</label><input type="number" step="0.01" value={form.cpm} onChange={(e) => set("cpm", e.target.value)} placeholder="18.50" /></div>
        </div>
        <div className="mk-form-row"><label>Validade</label><input type="date" value={form.validade} onChange={(e) => set("validade", e.target.value)} /></div>
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={!form.titular || !form.saldo} onClick={() => onSave(form)}>Salvar conta</button>
      </div>
    </div>
  );
}

function EmissionFormModal({ accounts, onClose, onSave }) {
  const [form, setForm] = useState({ accountId: accounts[0]?.id || "", data: "", destino: "", milhas: "", taxas: "", valorMercado: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const conta = accounts.find((a) => a.id === form.accountId);
  const cpm = conta ? Number(conta.cpm) : 0;
  const custoMilhas = (Number(form.milhas || 0) / 1000) * cpm;
  const custoTotal = custoMilhas + Number(form.taxas || 0);
  const economia = Number(form.valorMercado || 0) - custoTotal;

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>Nova emissão <button className="mk-iconbtn" onClick={onClose}><X size={18} /></button></h3>
        <div className="mk-form-row"><label>Conta</label>
          <select value={form.accountId} onChange={(e) => set("accountId", e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.programa} — {a.titular}</option>)}</select>
        </div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Data</label><input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></div>
          <div className="mk-form-row"><label>Destino</label><input value={form.destino} onChange={(e) => set("destino", e.target.value)} placeholder="GRU → LIS" /></div>
        </div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Milhas usadas</label><input type="number" value={form.milhas} onChange={(e) => set("milhas", e.target.value)} placeholder="80000" /></div>
          <div className="mk-form-row"><label>Taxas pagas (R$)</label><input type="number" step="0.01" value={form.taxas} onChange={(e) => set("taxas", e.target.value)} placeholder="350" /></div>
        </div>
        <div className="mk-form-row"><label>Valor de mercado da passagem (R$)</label><input type="number" step="0.01" value={form.valorMercado} onChange={(e) => set("valorMercado", e.target.value)} placeholder="6200" /></div>
        {form.milhas && form.valorMercado && (
          <div className="mk-preview">
            Custo estimado (milhas + taxas): <b>{formatBRL(custoTotal)}</b><br />
            Economia: <span className="economia" style={{ color: economia >= 0 ? "#34C495" : "#FF6B6B" }}>{formatBRL(economia)}</span>
          </div>
        )}
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={!form.destino || !form.milhas || !form.valorMercado} onClick={() => onSave(form)}>Salvar emissão</button>
      </div>
    </div>
  );
}

// ---------- Dashboard agregada do admin ----------
function AdminAggregateDashboard({ clients }) {
  const [loading, setLoading] = useState(true);
  const [agg, setAgg] = useState({ totalMilhas: 0, totalEconomia: 0, porCliente: [] });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("app_data").select("user_id, data");
      if (error) { console.error(error); setLoading(false); return; }
      let totalMilhas = 0, totalEconomia = 0;
      const porCliente = (data || []).map((row) => {
        const d = row.data || {};
        const accs = d.accounts || [];
        const ems = d.emissions || [];
        const milhas = accs.reduce((s, a) => s + Number(a.saldo || 0), 0);
        const economia = ems.reduce((s, e) => {
          const conta = accs.find((a) => a.id === e.accountId);
          const cpm = conta ? Number(conta.cpm) : 0;
          const custo = (Number(e.milhas) / 1000) * cpm + Number(e.taxas || 0);
          return s + (Number(e.valorMercado || 0) - custo);
        }, 0);
        totalMilhas += milhas; totalEconomia += economia;
        const client = clients.find((c) => c.id === row.user_id);
        return { id: row.user_id, nome: client?.nome || client?.email || "Cliente removido", milhas, economia };
      }).filter((c) => c.milhas > 0 || c.economia !== 0).sort((a, b) => b.milhas - a.milhas);
      setAgg({ totalMilhas, totalEconomia, porCliente });
      setLoading(false);
    })();
  }, [clients]);

  const vencendo = clients.filter((c) => c.plano_fim).map((c) => ({ ...c, dias: Math.ceil((new Date(c.plano_fim) - new Date()) / 86400000) })).filter((c) => c.dias <= 30).sort((a, b) => a.dias - b.dias);

  return (
    <>
      <div className="mk-grid">
        <div className="mk-stub"><div className="mk-stub-label"><Users size={13} /> Clientes gerenciados</div><div className="mk-stub-value">{clients.length}</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><Wallet size={13} /> Milhas sob gestão</div><div className="mk-stub-value">{agg.totalMilhas.toLocaleString("pt-BR")}</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><TrendingUp size={13} /> Economia gerada (todos)</div><div className="mk-stub-value" style={{ color: agg.totalEconomia >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(agg.totalEconomia)}</div></div>
        <div className="mk-stub"><div className="mk-stub-label"><CalendarClock size={13} /> Planos vencendo</div><div className="mk-stub-value">{vencendo.length || "—"}</div><div className="mk-stub-foot">{vencendo.length ? "nos próximos 30 dias" : "nenhum em breve"}</div></div>
      </div>

      <div className="mk-section-title"><h2>Clientes por volume de milhas</h2></div>
      {loading ? (
        <div className="mk-empty">Carregando…</div>
      ) : agg.porCliente.length === 0 ? (
        <div className="mk-empty">Nenhum dado lançado pelos clientes ainda.</div>
      ) : (
        <div className="mk-table-wrap" style={{ marginBottom: 22 }}>
          <table className="mk-table">
            <thead><tr><th>Cliente</th><th>Milhas</th><th>Economia</th></tr></thead>
            <tbody>
              {agg.porCliente.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.milhas.toLocaleString("pt-BR")}</td>
                  <td style={{ color: c.economia >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(c.economia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vencendo.length > 0 && (
        <>
          <div className="mk-section-title"><h2>Planos vencendo</h2></div>
          <div className="mk-stub">
            {vencendo.map((c) => (
              <div className="mk-alert-row" key={c.id}>
                <span>{c.nome || c.email}</span>
                <span className="mk-mono" style={{ color: c.dias < 0 ? "var(--red)" : "var(--ink)" }}>{c.dias < 0 ? "vencido" : `${c.dias} dia(s)`}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mk-empty" style={{ marginTop: 22 }}>
        Essa é uma primeira versão da dashboard de admin — me conta quais outros indicadores você quer ver aqui que eu expando.
      </div>
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
        const { error } = await supabase.from("profiles").update({
          nome: form.nome, cpf: onlyDigits(form.cpf) || null, telefone: form.telefone || null,
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
        <div className="mk-form-row"><label>E-mail (login)</label><input type="email" value={form.email} disabled={isEdit} onChange={(e) => set("email", e.target.value)} /></div>
        {!isEdit && <div className="mk-form-row"><label>Senha</label><input type="password" value={form.senha} onChange={(e) => set("senha", e.target.value)} minLength={6} /></div>}
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>CPF</label><input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
          <div className="mk-form-row"><label>Telefone</label><input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
        </div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Plano — valor pago (R$)</label><input type="number" step="0.01" value={form.planoValor} onChange={(e) => set("planoValor", e.target.value)} /></div>
          <div className="mk-form-row"><label>Parcelas</label><input type="number" min="1" step="1" value={form.planoParcelas} onChange={(e) => set("planoParcelas", e.target.value)} placeholder="1" /></div>
        </div>
        <div className="mk-form-cols">
          <div className="mk-form-row"><label>Início do plano</label><input type="date" value={form.planoInicio} onChange={(e) => set("planoInicio", e.target.value)} /></div>
          <div className="mk-form-row"><label>Fim do plano</label><input type="date" value={form.planoFim} onChange={(e) => set("planoFim", e.target.value)} /></div>
        </div>
        {err && <div className="mk-preview" style={{ color: "#FF6B6B" }}>{err}</div>}
        <button className="mk-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={loading || !form.nome || (!isEdit && (!form.email || form.senha.length < 6))} onClick={submit}>
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

  const loadClients = () => {
    supabase.from("profiles").select("*").eq("is_admin", false).order("nome").then(({ data, error }) => {
      if (error) console.error(error);
      setClients(data || []);
    });
  };
  useEffect(loadClients, []);

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
                <User size={14} /> <span className="mk-userpill-text">{adminEmail}</span> <ChevronDown size={14} />
              </button>
              {switcherOpen && (
                <div className="mk-switcher">
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
