import { APP_NAME } from "./config";
import { defaultTemplates } from "./templates/default-templates";

export function bootstrap(): void {
  void APP_NAME;
  void defaultTemplates;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
