import "./site.css";

// Preserve previously shared links that opened the game at the site root.
const legacy = new URL(location.href);
if (
  legacy.pathname === "/" &&
  (legacy.searchParams.has("room") || legacy.searchParams.has("seed"))
) {
  legacy.pathname = "/jogar/";
  location.replace(legacy.href);
}
const toggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
const nav = document.getElementById("main-nav");
function closeNavigation(): void {
  toggle?.setAttribute("aria-expanded", "false");
  nav?.classList.remove("open");
}
toggle?.addEventListener("click", () => {
  const expanded = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(expanded));
  nav?.classList.toggle("open", expanded);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeNavigation();
    toggle?.focus();
  }
});
nav?.addEventListener("click", (event) => {
  if ((event.target as Element).closest("a")) closeNavigation();
});
document.addEventListener("click", (event) => {
  if (!(event.target as Element).closest(".site-header")) closeNavigation();
});

if (
  document.querySelector("canvas[data-world-view],canvas[data-character-view]")
)
  void import("./worldPreview.ts").then((module) => module.preparePreviews());
const room = document.querySelector<HTMLInputElement>("#room");
const copy = document.querySelector<HTMLButtonElement>("#copyRoom");
const feedback = document.querySelector<HTMLElement>("#roomFeedback");
copy?.addEventListener("click", () => {
  if (!room?.reportValidity()) return;
  const url = new URL("/jogar/", location.origin);
  url.searchParams.set("room", room.value);
  void (async () => {
    try {
      await navigator.clipboard.writeText(url.href);
      if (feedback)
        feedback.textContent =
          "Link copiado. Envie para quem vai explorar com você.";
    } catch {
      if (feedback) {
        feedback.textContent = "Copie este link: ";
        const link = document.createElement("a");
        link.href = url.href;
        link.textContent = url.href;
        feedback.append(link);
      }
    }
  })();
});
const configured = (
  import.meta as ImportMeta & { env?: { VITE_MULTIPLAYER_URL?: string } }
).env?.VITE_MULTIPLAYER_URL;
const availability = document.getElementById("roomAvailability");
if (availability && !configured)
  availability.textContent =
    "O servidor online não está configurado nesta versão do site. O link abrirá a aventura local até a conexão ser habilitada.";
