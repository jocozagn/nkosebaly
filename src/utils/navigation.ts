/** Déclenche la barre de progression (router.push, actions programmatiques) */
export const triggerNavigationStart = (): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nko:navigation-start"));
  }
};
