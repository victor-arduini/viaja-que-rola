import React, { useState, useEffect, useMemo } from "react";
import {
  Plane, Wallet, TrendingUp, Eye, EyeOff, Plus, Trash2, CalendarClock, X, Award,
  LayoutDashboard, Users, Layers, PlaneTakeoff, CreditCard, User, CalendarCheck,
  Gift, ShoppingCart, BadgePercent, ArrowLeftRight, DollarSign, Ticket, ShieldCheck, Pencil
} from "lucide-react";

const PROGRAMAS = ["Smiles", "LATAM Pass", "TudoAzul", "Livelo", "Esfera", "Outro"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const maskCpf = (cpf) => { if (!cpf) return "—"; const d = cpf.replace(/\D/g, ""); if (d.length < 11) return cpf; return `***.${d.slice(3, 6)}.***-${d.slice(9, 11)}`; };

// ---------- Config-driven modules (sidebar items reproduced generically) ----------
const MODULES = [
  { key: "clientes", label: "Contas Gerenciadas", icon: Users, fields: [
      { key: "nome", label: "Nome", type: "text" },
      { key: "cpf", label: "CPF", type: "text" },
      { key: "telefone", label: "Telefone", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
  ]},
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
  { key: "clientes", label: "Contas Gerenciadas", icon: Users },
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

const EMPTY_DB = { accounts: [], emissions: [], clientes: [], programas: [], assinaturas: [], passageiros: [], reservas: [], comprasBonificadas: [], compraDePontos: [], creditosCartao: [], transferencias: [], vendasDeMilhas: [], resgates: [] };

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

// ---------- Main app ----------
function PainelMilhas({ userId, userEmail, onSignOut }) {
  const [tab, setTab] = useState("dashboard");
  const [db, setDb] = useState(null);
  const [showCpf, setShowCpf] = useState({});
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showEmissionForm, setShowEmissionForm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_data")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) console.error(error);
      setDb(data ? { ...EMPTY_DB, ...data.data } : EMPTY_DB);
    })();
  }, [userId]);

  useEffect(() => {
    if (!db) return;
    const timeout = setTimeout(() => {
      supabase.from("app_data").upsert({ user_id: userId, data: db, updated_at: new Date().toISOString() }).then(({ error }) => {
        if (error) console.error(error);
      });
    }, 500); // debounce: evita gravar a cada tecla digitada
    return () => clearTimeout(timeout);
  }, [db, userId]);

  const updateSlice = (key) => (updater) =>
    setDb((prev) => ({ ...prev, [key]: typeof updater === "function" ? updater(prev[key]) : updater }));

  if (!db) return <div style={{ background: "#050912", minHeight: "100%", padding: 40, color: "#8CA2C9", fontFamily: "sans-serif" }}>Carregando…</div>;

  const accounts = db.accounts, emissions = db.emissions;
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

  const reservasCalc = useMemo(() => (db.reservas || []).map((r) => ({
    ...r, economia: Number(r.valorMercado || 0) - Number(r.valorPago || 0),
  })), [db.reservas]);

  const totals = useMemo(() => {
    const totalMilhas = accounts.reduce((s, a) => s + Number(a.saldo || 0), 0);
    const patrimonio = accounts.reduce((s, a) => s + (Number(a.saldo || 0) / 1000) * Number(a.cpm || 0), 0);
    const economiaEmissoes = emissionsCalc.reduce((s, e) => s + e.economia, 0);
    const economiaReservas = reservasCalc.reduce((s, r) => s + r.economia, 0);
    const programasAtivos = new Set(accounts.map((a) => a.programa)).size;
    const porPrograma = PROGRAMAS.map((p) => ({ programa: p, saldo: accounts.filter((a) => a.programa === p).reduce((s, a) => s + Number(a.saldo || 0), 0) })).filter((p) => p.saldo > 0);
    const vencendo = accounts.filter((a) => a.validade).map((a) => ({ ...a, dias: Math.ceil((new Date(a.validade) - new Date()) / 86400000) })).filter((a) => a.dias <= 60).sort((a, b) => a.dias - b.dias);
    return { totalMilhas, patrimonio, economiaEmissoes, economiaReservas, programasAtivos, porPrograma, vencendo };
  }, [accounts, emissionsCalc, reservasCalc]);

  const addAccount = (data) => setAccounts((prev) => [...prev, { id: uid(), ...data }]);
  const removeAccount = (id) => { setAccounts((prev) => prev.filter((a) => a.id !== id)); setEmissions((prev) => prev.filter((e) => e.accountId !== id)); };
  const addEmission = (data) => setEmissions((prev) => [...prev, { id: uid(), ...data }]);
  const removeEmission = (id) => setEmissions((prev) => prev.filter((e) => e.id !== id));

  const activeModule = MODULES.find((m) => m.key === tab);
  const currentLabel = NAV.find((n) => n.key === tab)?.label || "Dashboard";

  const cpfGroups = useMemo(() => {
    const map = {};
    accounts.forEach((a) => {
      const key = a.cpf || "—";
      if (!map[key]) map[key] = { cpf: key, titular: a.titular, contas: [] };
      map[key].contas.push(a);
    });
    return Object.values(map);
  }, [accounts]);

  return (
    <div className="mk-root">
      <style>{`
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
        .mk-sidebar { width: 224px; flex-shrink: 0; background: rgba(3,7,16,0.55); border-right: 1px solid rgba(94,208,255,0.1); padding: 20px 12px; }
        .mk-sidebar-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; padding: 0 6px; }
        .mk-logo-badge { width: 36px; height: 36px; border-radius: 11px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 1px rgba(94,208,255,0.3), 0 8px 18px rgba(46,111,242,0.4); transform: rotate(-6deg); flex-shrink: 0; }
        .mk-logo-badge svg { transform: rotate(6deg); color: #fff; }
        .mk-sidebar-brand .name { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 15px; line-height: 1.1; background: linear-gradient(90deg, var(--ink), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .mk-sidebar-brand .sub { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--accent-2); font-weight: 600; }
        .mk-navlist { display: flex; flex-direction: column; gap: 2px; max-height: calc(100vh - 140px); overflow-y: auto; }
        .mk-navitem { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 12.5px; color: var(--muted); cursor: pointer; background: none; border: none; text-align: left; width: 100%; font-family: 'Space Grotesk', sans-serif; }
        .mk-navitem:hover { color: var(--ink); background: rgba(234,241,255,0.05); }
        .mk-navitem.active { background: linear-gradient(90deg, rgba(46,111,242,0.28), rgba(94,208,255,0.06)); color: #fff; font-weight: 600; box-shadow: inset 2px 0 0 var(--accent-2); }
        .mk-navitem svg { flex-shrink: 0; }

        .mk-main { flex: 1; min-width: 0; padding: 22px 26px 50px; overflow-x: hidden; }
        .mk-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .mk-topbar h2 { margin: 0; font-family: 'Sora', sans-serif; font-size: 21px; font-weight: 700; }
        .mk-userpill { display: flex; align-items: center; gap: 8px; background: rgba(234,241,255,0.06); border: 1px solid rgba(234,241,255,0.14); padding: 7px 12px; border-radius: 999px; font-size: 12.5px; }

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
        .mk-form-row input::placeholder { color: rgba(234,241,255,0.35); }
        .mk-form-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mk-preview { background: var(--card-2); border: 1px solid rgba(94,208,255,0.16); border-radius: 8px; padding: 12px 14px; margin-top: 6px; font-size: 13px; }
        .mk-preview .economia { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 16px; }
        .mk-alert-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(234,241,255,0.08); font-size: 13px; }
        .mk-alert-row:last-child { border-bottom: none; }
        .mk-signout-wrap { margin-top: 14px; padding-top: 14px; border-top: 1px dashed rgba(234,241,255,0.14); }
      `}</style>

      <div className="mk-app">
        <div className="mk-sidebar">
          <div className="mk-sidebar-brand">
            <div className="mk-logo-badge"><Plane size={17} strokeWidth={2.2} /></div>
            <div>
              <div className="sub">Arduini</div>
              <div className="name">Viaja que rola</div>
            </div>
          </div>
          <div className="mk-navlist">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <button key={n.key} className={`mk-navitem ${tab === n.key ? "active" : ""}`} onClick={() => setTab(n.key)}>
                  <Icon size={15} /> {n.label}
                </button>
              );
            })}
          </div>
          <div className="mk-signout-wrap">
            <div className="mk-field" style={{ marginBottom: 6 }}>{userEmail}</div>
            <button className="mk-navitem" onClick={onSignOut}>Sair</button>
          </div>
        </div>

        <div className="mk-main">
          <div className="mk-topbar">
            <h2>{currentLabel}</h2>
            <div className="mk-userpill"><User size={14} /> Victor Arduini</div>
          </div>

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
              </div>

              {totals.porPrograma.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <div className="mk-section-title"><h2>Visão geral das contas</h2></div>
                  <div className="mk-card-list">
                    {totals.porPrograma.map((p) => (
                      <div key={p.programa} className="mk-ticket" style={{ gridTemplateColumns: "1fr" }}>
                        <div className="mk-ticket-main" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="mk-ticket-title"><Plane size={15} /> {p.programa}</span>
                          <span className="mk-mono" style={{ fontWeight: 700 }}>{p.saldo.toLocaleString("pt-BR")} milhas</span>
                        </div>
                      </div>
                    ))}
                  </div>
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
              {accounts.length === 0 && <div className="mk-empty">Nenhuma conta cadastrada ainda. Vá em "Contas" para começar.</div>}
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

// ---------- Auth gate ----------
function LoginScreen() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    const fn = mode === "signin" ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) setMsg(error.message);
    else if (mode === "signup") setMsg("Conta criada! Verifique seu e-mail para confirmar o acesso.");
  };

  return (
    <div className="mk-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Space+Grotesk:wght@400;500;600&display=swap');
        .mk-root { --bg:#050912; --bg-2:#0B1A3D; --card:#0F2049; --accent:#2E6FF2; --accent-2:#5ED0FF; --ink:#EAF1FF; --muted:#8CA2C9; color-scheme:dark; font-family:'Space Grotesk',sans-serif; background: radial-gradient(circle at 15% -10%, rgba(94,208,255,0.16), transparent 45%), linear-gradient(160deg, var(--bg), var(--bg-2) 70%); color: var(--ink); }
        .mk-login-card { background: var(--card); border: 1px solid rgba(94,208,255,0.18); border-radius: 14px; padding: 32px; width: 100%; max-width: 360px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .mk-login-card h1 { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px; margin: 4px 0 4px; background: linear-gradient(90deg, var(--ink), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .mk-login-card p { color: var(--muted); font-size: 13px; margin: 0 0 20px; }
        .mk-login-card input { width: 100%; border: 1px solid rgba(234,241,255,0.18); border-radius: 8px; padding: 10px 12px; font-size: 14px; background: rgba(234,241,255,0.06); color: var(--ink); margin-bottom: 12px; font-family: 'Space Grotesk', sans-serif; }
        .mk-login-card button[type=submit] { width: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); color: #06122B; border: none; padding: 11px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .mk-login-card .switch { margin-top: 14px; text-align: center; font-size: 12.5px; color: var(--muted); cursor: pointer; }
        .mk-login-card .msg { margin-top: 12px; font-size: 12.5px; color: var(--accent-2); }
      `}</style>
      <div className="mk-login-card">
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent-2)" }}>Arduini</div>
        <h1>Viaja que rola</h1>
        <p>{mode === "signin" ? "Entre para acessar seu painel de milhas." : "Crie sua conta para começar."}</p>
        <form onSubmit={submit}>
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit" disabled={loading}>{loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}</button>
        </form>
        <div className="switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(""); }}>
          {mode === "signin" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </div>
        {msg && <div className="msg">{msg}</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ background: "#050912", minHeight: "100vh", color: "#8CA2C9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Carregando…</div>;
  }
  if (!session) return <LoginScreen />;

  return (
    <PainelMilhas
      userId={session.user.id}
      userEmail={session.user.email}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
