console.log("Lancement content.js");

function playNotifSound() {
  console.log("Background : play sound notif");
  const audio = new Audio(chrome.runtime.getURL("./Sounds/notif2.mp3"));
  audio.play();
}
let favoriteHost = "";
chrome.runtime.sendMessage({ action: "getParameter", data: "host" }, (response) => {
  if (chrome.runtime.lastError) {
    console.warn("Impossible de récupérer le lecteur favori", chrome.runtime.lastError.message);
    return;
  }
  if (!response || response.status !== "ok") {
    console.warn("Pas de réponse du background ou erreur", response);
    return;
  }

  favoriteHost = typeof response.data?.value === "string" ? response.data.value : "";
  const url = new URL(window.location.href);

  if (!url.searchParams.has("host")) {
    url.searchParams.set("host", favoriteHost);
    window.location.replace(url.toString());
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "PlayNotifSound") {
    playNotifSound();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const nextBtn = document.querySelector(".nav-next .next_page");
  const previousBtn = document.querySelector(".nav-previous .prev_page");

  if (document.getElementsByClassName("plyr-container")) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "nextEpisode") {
        nextBtn?.click();
      }
      if (msg.action === "previousEpisode") {
        previousBtn?.click();
      }
    });

    console.log("Content : url validé");
    const breadcrumb = document.querySelectorAll(".breadcrumb li");
    const url = window.location.href;
    const alias = "";
    const nouveau = true;
    const principal = true;
    const date = new Date();
    let next = "";

    const episode = document.querySelector(".selectpicker_chapter option[selected]").textContent.trim();

    if (nextBtn) {
      next = nextBtn.href;
    }

    console.log("Content : init message");

    if (breadcrumb.length >= 3) {
      const animeTitle = breadcrumb[1].querySelector("a")?.innerText.trim();
      if (animeTitle && episode && url) {
        console.log("envoi new anime");
        chrome.runtime.sendMessage({
          action: "addAnime",
          data: { title: animeTitle, episode, url, next, alias, date },
        });
      }
    }
  }

  const hostSelects = document.querySelectorAll("select.host-select");
  if (hostSelects.length) {
    const starFull = chrome.runtime.getURL("Icons/starFull.svg");
    const starEmpty = chrome.runtime.getURL("Icons/starEmpty.svg");
    hostSelects.forEach((select) => {
      injectFavMark(select, favoriteHost, starFull, starEmpty);
    });
  }
});

function injectFavMark(select, initialFavorite, starFull, starEmpty) {
  let favoriteHost = initialFavorite;
  const parent = select.parentElement;
  if (!parent) return;
  if (getComputedStyle(parent).position === "static") {
    parent.style.position = "relative";
  }

  const existingIcon = parent.querySelector(":scope > .star-icon");
  if (existingIcon) existingIcon.remove();

  const icon = document.createElement("img");
  icon.className = "star-icon";
  icon.style.width = "1.2em";
  icon.style.cursor = "pointer";
  icon.style.position = "absolute";
  icon.style.transform = "translate(-50%, -50%)";
  icon.style.zIndex = "10";
  icon.style.margin = "0";
  icon.title = "Définir le lecteur sélectionné comme favori";
  icon.setAttribute("role", "button");
  icon.tabIndex = 0;

  const updateIconAndOptions = () => {
    const selectedIsFavorite = Boolean(favoriteHost) && select.value === favoriteHost;
    icon.classList.toggle("star-full", selectedIsFavorite);
    icon.classList.toggle("star-empty", !selectedIsFavorite);
    icon.src = selectedIsFavorite ? starFull : starEmpty;
    icon.alt = selectedIsFavorite ? "lecteur favori" : "lecteur non favori";
    icon.title = selectedIsFavorite ? "Retirer ce lecteur des favoris" : "Définir le lecteur sélectionné comme favori";

    Array.from(select.options).forEach((option) => {
      if (option.dataset.baseLabel === undefined) {
        option.dataset.baseLabel = option.textContent.replace(/^\s*★\s*/, "").replace(/\s+★$/, "");
      }
      option.textContent = option.value === favoriteHost && favoriteHost ? `${option.dataset.baseLabel} (favori)` : option.dataset.baseLabel;
    });
  };

  const toggleFavorite = () => {
    const nextFavorite = select.value === favoriteHost ? "" : select.value;
    chrome.runtime.sendMessage({ action: "updateParameter", data: { title: "host", value: nextFavorite } }, (response) => {
      if (chrome.runtime.lastError || response?.status !== "ok") {
        console.warn("Impossible de mettre à jour le lecteur favori", chrome.runtime.lastError?.message || response);
        return;
      }
      favoriteHost = nextFavorite;
      updateIconAndOptions();
    });
  };

  icon.addEventListener("click", toggleFavorite);
  icon.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFavorite();
    }
  });
  select.addEventListener("change", updateIconAndOptions);
  const positionIcon = () => {
    icon.style.left = `${select.offsetLeft}px`;
    icon.style.top = `${select.offsetTop + select.offsetHeight / 2}px`;
  };
  parent.appendChild(icon);
  positionIcon();
  window.addEventListener("resize", positionIcon);
  updateIconAndOptions();
}
