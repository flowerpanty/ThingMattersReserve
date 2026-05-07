(function () {
  const fieldErrorClass = "fieldError";

  function track(eventName, params) {
    if (!eventName || typeof window.gtag !== "function") return;
    window.gtag("event", eventName, {
      event_category: "order_builder",
      page_path: window.location.pathname,
      ...params
    });
  }

  function getField(id) {
    return typeof id === "string" ? document.getElementById(id) : id;
  }

  function getErrorNode(field) {
    if (!field) return null;
    const id = field.id ? `${field.id}Error` : "";
    if (id) {
      const byId = document.getElementById(id);
      if (byId) return byId;
    }

    const parent = field.closest("label, .dateBox, .methodExtra, .fieldShell") || field.parentElement;
    return parent ? parent.querySelector(`.${fieldErrorClass}`) : null;
  }

  function setFieldError(fieldOrId, message) {
    const field = getField(fieldOrId);
    if (!field) return false;
    const errorNode = getErrorNode(field);
    field.setAttribute("aria-invalid", "true");
    field.classList.add("is-invalid");

    if (errorNode) {
      errorNode.textContent = message;
      errorNode.hidden = false;
      if (errorNode.id) field.setAttribute("aria-describedby", errorNode.id);
    }

    return false;
  }

  function clearFieldError(fieldOrId) {
    const field = getField(fieldOrId);
    if (!field) return;
    const errorNode = getErrorNode(field);
    field.removeAttribute("aria-invalid");
    field.classList.remove("is-invalid");

    if (errorNode) {
      errorNode.textContent = "";
      errorNode.hidden = true;
    }
  }

  function focusField(fieldOrId) {
    const field = getField(fieldOrId);
    if (!field) return;
    field.focus({ preventScroll: true });
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setupStepHistory(options) {
    const getStep = options.getStep;
    const setStep = options.setStep;
    let internal = false;

    const normalizeStep = (value) => {
      const next = Number.parseInt(value || "", 10);
      return Number.isFinite(next) ? next : getStep();
    };

    const currentUrlStep = normalizeStep(new URLSearchParams(window.location.search).get("step"));
    if (currentUrlStep && currentUrlStep !== getStep()) {
      internal = true;
      setStep(currentUrlStep, { fromHistory: true, skipValidation: true });
      internal = false;
    }

    window.addEventListener("popstate", (event) => {
      const step = normalizeStep(event.state?.step || new URLSearchParams(window.location.search).get("step"));
      internal = true;
      setStep(step, { fromHistory: true, skipValidation: true });
      internal = false;
    });

    return function pushStep(step) {
      if (internal) return;
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(step));
      window.history.pushState({ step }, "", url);
    };
  }

  window.NMOrderCore = {
    clearFieldError,
    focusField,
    setFieldError,
    setupStepHistory,
    track
  };
})();
