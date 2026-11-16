export default function Home() {
  return (
    <div className="av-hero">
      <h1>Arcade Vault</h1>
      <p className="sub">
        Press start<span className="blink">_</span>
      </p>
      <div className="detail-actions" style={{ justifyContent: "center", marginTop: 32 }}>
        <button className="btn">Jugar</button>
        <button className="btn magenta">Salón de la fama</button>
      </div>
    </div>
  );
}
