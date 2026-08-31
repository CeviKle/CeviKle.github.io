const Timer = (() => {
    let intervalId = null;
    let endTimeMs = null;
    let clockOffsetMs = 0; // serverTime - Date.now(), computed once at start()

    function start(endTimeIso, serverTimeIso, onTick, onExpire) {
        stop();
        endTimeMs = Date.parse(endTimeIso);
        clockOffsetMs = Date.parse(serverTimeIso) - Date.now();

        function tick() {
            const remaining = endTimeMs - (Date.now() + clockOffsetMs);
            if (remaining <= 0) {
                stop();
                onTick(0);
                onExpire();
                return;
            }
            onTick(remaining);
        }

        tick();
        intervalId = setInterval(tick, 1000);
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return { start, stop };
})();
