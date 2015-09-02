window.Gateway = ->
  self = @
  stopsUrl = "http://tosamara.ru/poisk/stops.php"
  transportUrl = "http://tosamara.ru/xml_bridge.php"
  transportRegexp = /(<li class="trans-ico-([^"]+)".*class="trans-min-count">([^<]*).*class="trans-name">([^:]+):([^<]*).*class="trans-detail">([^<]*).*class="trans-detail">([^<]*))/gim
  layout = [
    [/q/g, "й"], [/w/g, "ц"], [/e/g, "у"], [/r/g, "к"], [/t/g, "е"], [/y/g, "н"], [/u/g, "г"], [/i/g, "ш"], [/o/g, "щ"], [/p/g, "з"], [/\[|\{/g, "х"], [/\]|\}/g, "ъ"],
    [/a/g, "ф"], [/s/g, "ы"], [/d/g, "в"], [/f/g, "а"], [/g/g, "п"], [/h/g, "р"], [/j/g, "о"], [/k/g, "л"], [/l/g, "д"], [/;|:/g, "ж"], [/'|"/g, "э"],
    [/z/g, "я"], [/x/g, "ч"], [/c/g, "с"], [/v/g, "м"], [/b/g, "и"], [/n/g, "т"], [/m/g, "ь"], [/,|</g, "б"], [/\.|>/g, "ю"], [/`|~/g, "ё"]
  ]
  humanTypes = { rail: "Трамвай", bus: "Автобус", trol: "Троллейбус" }

  normalize = (str) ->
    str.replace(/\t|\r|\n/g, "").replace(/&nbsp;/g, " ")

  fixLayout = (str) ->
    _.each(layout, (chars) ->
      str = str.replace(chars[0], chars[1])
    )
    str

  unpackStop = (stop) ->
    id: stop.i
    name: stop.n
    subname: stop.d
    lat: stop.a
    lon: stop.o

  parseStops = (name) ->
    result = []
    regexp = new RegExp("(^|[^А-Яа-я0-9])#{name}", "i")
    i = 0
    while (i < stops.length)
      stop = stops[i]
      if stop.n.search(regexp) > -1
        result.push(unpackStop(stop))
      i++
    result

  parseTransport = (html) ->
    transport = []
    html = html.split(/<\/li>/)
    html.pop()
    window.s = html
    transport = _.map(html, (stopHtml) ->
      regexp = new RegExp(transportRegexp)
      stop = regexp.exec(stopHtml)

      type: stop[2]
      est: stop[3]
      number: stop[4]
      route: stop[5]
      spec: stop[6]
      marker: stop[7],
      humanType: humanTypes[stop[2]]
    )
    transport

  self.loadStops = (name, callback) ->
    callback(parseStops(fixLayout(name)))

  self.findStopsByIds = (ids, callback) ->
    result = []
    i = 0
    ids = _.map(ids, (i) -> i.toString())
    while (i < stops.length)
      stop = stops[i]
      j = 0
      if (ids.indexOf(stop.i) > -1)
        result.push(unpackStop(stop))
      i++
    callback(result)

  self.loadTransport = (stopId, callback) ->
    $.post(transportUrl, method: "getFirstArrivalToStop", KS_ID: stopId, COUNT: 10, version: "mobile", (response) ->
      callback(parseTransport(normalize(response)))
    )

  @
