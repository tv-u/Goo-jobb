(() => {
  "use strict";

  const LANGUAGES = [
    ["en", "English", "English"],
    ["hi", "Hindi", "हिन्दी"],
    ["es", "Spanish", "Español"],
    ["fr", "French", "Français"],
    ["de", "German", "Deutsch"],
    ["pt", "Portuguese", "Português"],
    ["it", "Italian", "Italiano"],
    ["ja", "Japanese", "日本語"],
    ["ko", "Korean", "한국어"],
    ["zh", "Chinese", "中文"]
  ];

  const T = {

    en: {
      search: "Search jobs",
      jobs: "Jobs",
      location: "Location",
      salary: "Salary",
      company: "Company",
      apply: "Apply",
      details: "View details",
      live: "Live",
      source: "Source",
      remote: "Remote",
      latest: "Latest jobs"
    },

    hi: {
      search: "नौकरी खोजें",
      jobs: "नौकरियां",
      location: "स्थान",
      salary: "वेतन",
      company: "कंपनी",
      apply: "आवेदन करें",
      details: "विवरण देखें",
      live: "लाइव",
      source: "स्रोत",
      remote: "रिमोट",
      latest: "नई नौकरियां"
    },

    es: {
      search: "Buscar empleos",
      jobs: "Empleos",
      location: "Ubicación",
      salary: "Salario",
      company: "Empresa",
      apply: "Aplicar",
      details: "Ver detalles",
      live: "En vivo",
      source: "Fuente",
      remote: "Remoto",
      latest: "Últimos empleos"
    },

    fr: {
      search: "Rechercher des emplois",
      jobs: "Emplois",
      location: "Lieu",
      salary: "Salaire",
      company: "Entreprise",
      apply: "Postuler",
      details: "Voir les détails",
      live: "En direct",
      source: "Source",
      remote: "Télétravail",
      latest: "Derniers emplois"
    },

    de: {
      search: "Jobs suchen",
      jobs: "Jobs",
      location: "Ort",
      salary: "Gehalt",
      company: "Unternehmen",
      apply: "Bewerben",
      details: "Details ansehen",
      live: "Live",
      source: "Quelle",
      remote: "Remote",
      latest: "Neueste Jobs"
    },

    pt: {
      search: "Pesquisar vagas",
      jobs: "Vagas",
      location: "Localização",
      salary: "Salário",
      company: "Empresa",
      apply: "Candidatar-se",
      details: "Ver detalhes",
      live: "Ao vivo",
      source: "Fonte",
      remote: "Remoto",
      latest: "Vagas recentes"
    },

    it: {
      search: "Cerca lavori",
      jobs: "Lavori",
      location: "Posizione",
      salary: "Stipendio",
      company: "Azienda",
      apply: "Candidati",
      details: "Vedi dettagli",
      live: "Live",
      source: "Fonte",
      remote: "Remoto",
      latest: "Ultimi lavori"
    },

    ja: {
      search: "求人を検索",
      jobs: "求人",
      location: "勤務地",
      salary: "給与",
      company: "会社",
      apply: "応募",
      details: "詳細を見る",
      live: "ライブ",
      source: "情報源",
      remote: "リモート",
      latest: "最新の求人"
    },

    ko: {
      search: "채용 검색",
      jobs: "채용",
      location: "위치",
      salary: "급여",
      company: "회사",
      apply: "지원",
      details: "상세 보기",
      live: "실시간",
      source: "출처",
      remote: "원격",
      latest: "최신 채용"
    },

    zh: {
      search: "搜索职位",
      jobs: "职位",
      location: "地点",
      salary: "薪资",
      company: "公司",
      apply: "申请",
      details: "查看详情",
      live: "实时",
      source: "来源",
      remote: "远程",
      latest: "最新职位"
    }
  };

  function getLanguage() {
    return (
      localStorage.getItem(
        "goo-language"
      ) || "en"
    );
  }

  function translate(code) {

    const dictionary =
      T[code] || T.en;

    document.documentElement.lang =
      code;

    document
      .querySelectorAll(
        "[data-i18n]"
      )
      .forEach(
        element => {

          const key =
            element.dataset.i18n;

          if (
            dictionary[key] !==
            undefined
          ) {
            element.textContent =
              dictionary[key];
          }
        }
      );

    document
      .querySelectorAll(
        "[data-i18n-placeholder]"
      )
      .forEach(
        element => {

          const key =
            element.dataset
              .i18nPlaceholder;

          if (
            dictionary[key] !==
            undefined
          ) {
            element.placeholder =
              dictionary[key];
          }
        }
      );

    document
      .querySelectorAll(
        "[data-i18n-title]"
      )
      .forEach(
        element => {

          const key =
            element.dataset
              .i18nTitle;

          if (
            dictionary[key] !==
            undefined
          ) {
            element.title =
              dictionary[key];
          }
        }
      );

    document
      .querySelectorAll(
        ".goo-language-option"
      )
      .forEach(
        button => {

          button.setAttribute(
            "aria-current",
            button.dataset.lang ===
              code
              ? "true"
              : "false"
          );
        }
      );

    window.dispatchEvent(
      new CustomEvent(
        "goo:language-change",
        {
          detail: {
            code,
            dictionary
          }
        }
      )
    );
  }

  function render() {

    document
      .querySelectorAll(
        "[data-goo-language-list]"
      )
      .forEach(
        host => {

          if (
            host.dataset
              .gooLanguageReady
          ) {
            return;
          }

          host.dataset
            .gooLanguageReady =
            "1";

          LANGUAGES.forEach(
            ([code, name, native]) => {

              const button =
                document.createElement(
                  "button"
                );

              button.type =
                "button";

              button.className =
                "goo-language-option";

              button.dataset.lang =
                code;

              button.textContent =
                native;

              button.title =
                name;

              button.addEventListener(
                "click",
                () => {

                  localStorage.setItem(
                    "goo-language",
                    code
                  );

                  translate(code);
                }
              );

              host.appendChild(
                button
              );
            }
          );
        }
      );

    translate(
      getLanguage()
    );
  }

  window.GOO_TOP10_LANGUAGES =
    LANGUAGES;

  window.GOO_TRANSLATE =
    translate;

  window.GOO_I18N =
    T;

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      render,
      {
        once: true
      }
    );

  } else {

    render();

  }

})();
