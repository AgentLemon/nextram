window.Timer = (interval) ->
  interval ||= 30000
  self = @
  functions = {}
  timer = null
  count = 0

  tick = ->
    for key, func of functions
      func()

  startTimer = ->
    timer = setInterval(tick, interval)

  stopTimer = ->
    clearInterval(timer)

  self.clear = ->
    functions = {}
    count = 0
    stopTimer()

  self.push = (id, func) ->
    functions[id] = func
    count++
    if (count == 1)
      startTimer()

  self.delete = (id) ->
    delete functions[id]
    count--
    if (count == 0)
      stopTimer()

  @
