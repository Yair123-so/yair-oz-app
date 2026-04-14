(function () {
  const serviceSelect = document.getElementById("service");
  const serviceCards = Array.from(document.querySelectorAll(".service-card"));

  if (!serviceSelect || !serviceCards.length) return;

  function syncCardsFromSelect() {
    const currentValue = serviceSelect.value;
    serviceCards.forEach((card) => {
      const isSelected = card.dataset.value === currentValue;
      card.classList.toggle("selected", isSelected);
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
  }

  serviceCards.forEach((card) => {
    card.addEventListener("click", function () {
      const value = this.dataset.value || "";
      serviceSelect.value = value;
      serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      syncCardsFromSelect();
    });
  });

  syncCardsFromSelect();
})();