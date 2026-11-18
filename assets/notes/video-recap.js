(() => {
  const videos = [...document.querySelectorAll('.note-video video')]
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting && !entry.target.paused && !document.fullscreenElement &&
          !entry.target.webkitDisplayingFullscreen) entry.target.pause()
    }
  }) : null
  for (const video of videos) {
    const card = video.closest('.note-video')
    const start = card.querySelector('.note-video-start')
    start.hidden = false
    video.controls = false
    function enableControls() {
      start.hidden = true
      video.controls = true
    }
    start.addEventListener('click', () => {
      enableControls()
      video.play().catch(() => { video.controls = true })
    })
    video.addEventListener('play', () => {
      enableControls()
      for (const other of videos) if (other !== video) other.pause()
    })
    card.querySelector('.note-video-next').addEventListener('click', () => video.pause())
    observer?.observe(video)
  }
})()
