export default function HomePage() {
  return (
    <main>
      <h1>1ly Agent Commerce Demo</h1>
      <p>
        This dashboard is the human demo surface. Core autonomy runs in your DigitalOcean OpenClaw agent.
      </p>

      <div className="grid">
        <section className="card">
          <h2>Human Request Flow</h2>
          <p>Submit request via <code>POST /api/request</code>, then follow status.</p>
        </section>

        <section className="card">
          <h2>External Agent Flow</h2>
          <p>Other agents call <code>POST /api/agent/request</code> and paid fulfill endpoint.</p>
        </section>

        <section className="card">
          <h2>Coffee Sponsorship</h2>
          <p>Quote, queue, batch execute and optionally track delivery status.</p>
        </section>
      </div>
    </main>
  );
}
