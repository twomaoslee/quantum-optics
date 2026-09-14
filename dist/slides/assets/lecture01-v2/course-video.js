/* Explicitly load classroom videos and wait for YouTube's onReady event.
   An iframe load event alone is not evidence that the player is usable. */
(() => {
  const TIMEOUT = 15000;
  let apiPromise;

  function loadAPI() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      const previous = window.onYouTubeIframeAPIReady;
      const timer = setTimeout(fail, TIMEOUT);
      function fail() {
        clearTimeout(timer);
        script.remove();
        reject(new Error('播放器连接超时。请重试，或在YouTube打开。'));
      }
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      script.onerror = fail;
      document.head.append(script);
    }).catch(error => {
      apiPromise = undefined; // A failed attempt must not poison retries.
      throw error;
    });
    return apiPromise;
  }

  document.querySelectorAll('.course-youtube').forEach(card => {
    const button = card.querySelector('.course-player-start');
    const status = card.querySelector('.course-player-status');
    const stage = card.querySelector('.course-player-stage');
    const cover = card.querySelector('.course-player-cover');
    let player;
    let timer;
    let generation = 0;
    button.hidden = false;

    function discardPlayer() {
      clearTimeout(timer);
      try { player?.destroy(); } catch (_) { /* The iframe may already be gone. */ }
      player = undefined;
      stage.replaceChildren();
      stage.hidden = true;
      cover.hidden = false;
    }

    function failed(message, token) {
      if (token !== generation) return;
      generation += 1; // Ignore late ready/error callbacks from this attempt.
      discardPlayer();
      card.dataset.state = 'error';
      status.textContent = message;
      button.textContent = '重新加载视频';
      button.disabled = false;
    }

    button.addEventListener('click', async () => {
      const token = ++generation;
      discardPlayer();
      card.dataset.state = 'loading';
      button.disabled = true;
      status.textContent = '正在连接视频，最多等待15秒…';
      timer = setTimeout(() => failed('播放器连接超时。请重试，或在YouTube打开。', token), TIMEOUT);
      try {
        const YT = await loadAPI();
        if (token !== generation) return;
        const mount = document.createElement('div');
        stage.append(mount);
        stage.hidden = false;
        player = new YT.Player(mount, {
          width: '100%', height: '100%', videoId: card.dataset.videoId,
          playerVars: { playsinline: 1, origin: window.location.origin },
          events: {
            onReady(event) {
              if (token !== generation) return;
              clearTimeout(timer);
              cover.hidden = true;
              card.dataset.state = 'ready';
              status.textContent = '视频已就绪；若未开始，请点击画面中的播放键。';
              button.textContent = '重新加载视频';
              button.disabled = false;
              event.target.playVideo();
            },
            onStateChange(event) {
              if (token !== generation) return;
              const labels = { 0: '播放结束。', 1: '正在播放。', 2: '已暂停。', 3: '正在缓冲；也可在YouTube打开。' };
              if (labels[event.data]) status.textContent = labels[event.data];
              if (event.data === 1) card.dataset.state = 'playing';
            },
            onAutoplayBlocked() {
              if (token === generation) status.textContent = '请点击画面中的播放键。';
            },
            onError(event) {
              const message = [101, 150, 153].includes(event.data)
                ? '当前播放器无法内嵌播放，请在YouTube打开。'
                : '视频暂时无法播放。请重试，或在YouTube打开。';
              failed(message, token);
            }
          }
        });
      } catch (_) {
        failed('无法连接视频。请重试，或在YouTube打开。', token);
      }
    });
  });
})();
