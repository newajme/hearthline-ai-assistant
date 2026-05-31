export default function WorkmentoRouteLoader() {
  return (
    <div className="workmento-route-loader" role="status" aria-live="polite">
      <img
        src="/branding/workmento-loader.gif"
        alt=""
        className="workmento-route-loader-gif"
      />
      <span className="workmento-route-loader-text">Opening Workmento…</span>
    </div>
  );
}
