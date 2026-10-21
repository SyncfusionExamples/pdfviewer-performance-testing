// Browser-side helper for the Blazor Server performance sample.
// Remembers the time of the user's last click, key press, or scroll, so a page change
// can be timed from the moment the user asked for it (including the server round trip).
window.pdfPerf = (function () {
    var lastInteraction = 0;
    function mark() { lastInteraction = performance.now(); }
    ['pointerdown', 'keydown', 'wheel'].forEach(function (type) {
        document.addEventListener(type, mark, { capture: true, passive: true });
    });
    return {
        /** Milliseconds since the last interaction, or -1 if it was longer ago than windowMs. */
        sinceInteraction: function (windowMs) {
            var elapsed = performance.now() - lastInteraction;
            return lastInteraction > 0 && elapsed <= windowMs ? elapsed : -1;
        }
    };
})();
