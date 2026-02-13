(function () {
  // Theme toggle
  var saved = localStorage.getItem("theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var theme = saved || (prefersDark ? "dark" : "dark");
  document.documentElement.setAttribute("data-theme", theme);

  // Scroll fade-in
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.addEventListener("DOMContentLoaded", function () {
    // Toggle button
    document.querySelector(".theme-toggle").addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });

    // Observe fade-in elements
    document.querySelectorAll(".fade-in").forEach(function (el) {
      observer.observe(el);
    });
  });
})();
