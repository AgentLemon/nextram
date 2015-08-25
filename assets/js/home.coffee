$ ->
  stopCardTemplate = 
  stopCardTemplate = _.template($("#stop-card-template").html())

  stopsCount = 15

  $page = $(".page-wrap")
  $search = $(".search")
  $searchCard = $(".search-card")
  $geolocator = $(".geolocator")
  $noContent = $(".no-content")
  
  $results = $(".results")
  $geowrap = $(".geowrap")
  $transportTop = $(".transport-top")
  $currentStop = $(".current-stop")

  gateway = new Gateway();
  lastStopId = null;
  state = "stops"
  showGeo = $.parseJSON($.cookie("showGeo") || false);
  timer = null
  pos = null

  setLoading = ->
    $results.empty().append($('<div class="item empty"></div>').text("Загружаю..."))

  pushStop = (id, name, subname, lat, lon) ->
    stopsCookie = $.cookie("lastStops")
    stops = stopsCookie && $.parseJSON(stopsCookie) || []
    stops = _.reject(stops, (stop) -> !stop || stop.id == id)
    stops.unshift(id: id, name: name, subname: subname, lat: lat, lon: lon)
    $.cookie("lastStops", JSON.stringify(stops.slice(0, 10)), expires: 356)

  openStop = (stopId, name, subname, store, lat, lon) ->
    $geolocator.hide()
    lastStopId = stopId
    state = "transport"
    gateway.loadTransport(stopId, (transport) -> displayTransport(transport))
    if name && subname
      setLoading()
      $transportTop.show()
      $search.closest(".item").hide()
      $currentStop.show()
      $currentStop.find(".name").text(name)
      $currentStop.find(".subname").text(subname)
    if store
      window.location.hash = $.param(id: stopId, name: name, subname: subname, lat: lat, lon: lon)
      pushStop(stopId, name, subname, lat, lon)

  reload = ->
    openStop(lastStopId) if lastStopId

  clear = ->
    $(".stop-card").remove()

  getDistance = (lat, lon) ->
    radlat1 = Math.PI * lat/180
    radlat2 = Math.PI * pos.lat/180
    radlon1 = Math.PI * lon/180
    radlon2 = Math.PI * pos.lon/180
    theta = lon - pos.lon
    radtheta = Math.PI * theta/180
    dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180/Math.PI
    dist = dist * 60 * 1.1515
    dist = dist * 1609.344
    Math.round(dist)

  normalizeStops = (stops) ->
    _.each(stops, (stop) ->
      if pos && stop.lat && stop.lon
        stop.distance = getDistance(stop.lat, stop.lon)
    )
    stops = _.sortBy(stops, (s) -> if s.distance then s.distance else 100000)
    stops.slice(0, stopsCount)

  groupStops = (stops) ->
    groupedStops = _.groupBy(stops, "name")
    result = []
    _.each(groupedStops, (substops, key) ->
      stop = { title: key }
      stop["stops"] = _.map(substops, (i) ->
        name = i.subname
        if (i.distance)
          name += " (#{i.distance}&nbsp;м)"
        name: name, id: i.id
      )
      result.push(stop)
    )
    result


  displayStops = (stops) ->
    if state == "stops"
      $noContent.addClass("hidden")
      clear()
      _.each(groupStops(stops), (stop, index) ->
        $card = $(stopCardTemplate(stop))
        $card.addClass("hidden")
        $card.find(".show-short").on("click", ->
          $(this).closest(".content-wrap").prev(".short-details").toggleClass("hidden")
        )
        window.setTimeout((-> $card.removeClass("hidden")), index*200)
        $page.append($card)
        # $item = $('<div class="item stop"></div>')
        # $name = $('<div class="name"></div>').text(stop.name)
        # $subname = $('<div class="subname"></div>').text(stop.subname)
        # if stop.distance
        #   $subname.append(" (" + stop.distance + "m)")
        # $item.append($name).append($subname)
        # $item.on("click", ->
        #   openStop(stop.id, stop.name, stop.subname, true, stop.lat, stop.lon)
        #   timer = setInterval(reload, 30000)
        # )
        # $results.append($item)
      )

  displayTransport = (transport) ->
    if state == "transport"
      $results.empty()
      if transport.length > 0
        _.each(transport, (trans) ->
          $item = $('<div class="item transport"></div>').addClass(trans.type)
          $est = $('<div class="est"></div>')
            .append($('<div class="icon"></div>'))
            .append($("<span></span>").addClass("est-time").text(trans.est))
            .append(" мин")
          $route = $('<div class="route"></div>')
            .append($("<span/>").addClass("route").html(trans.route))
            .prepend($("<span></span>").addClass("number").text(trans.number))
          $spec = $('<div class="spec"></div>').text(trans.spec)
          $marker = $('<div class="marker"></div>').text(trans.marker)
          $item.append($est).append($route).append($spec).append($marker)
          $results.append($item)
        )
      else
        $results.append($('<div class="item empty"></div>').text("Пусто :-("))

  findStops = (name) ->
    lastStopId = null
    $transportTop.hide()
    gateway.loadStops(name, (stops) -> displayStops(normalizeStops(stops)))

  displayLastStops = ->
    stopsCookie = $.cookie("lastStops")
    if stopsCookie
      displayStops(normalizeStops($.parseJSON(stopsCookie)))
    else
      clear()
      $noContent.removeClass("hidden")

  reset = ->
    state = "stops"
    clearInterval(timer)
    $results.empty()
    $search.closest(".item").show()
    $transportTop.hide()
    $currentStop.hide()
    window.location.hash = ""
    if pos
      $geolocator.show()
      setGeoState()
    else
      $search.focus()

  loadStops = ->
    value = $search.val()
    if value
      findStops(value)
    else
      displayLastStops()

  getLocationHash = ->
    hash = window.location.hash
    result = {}
    regexp = /[#&]?([^=]*)=([^&$]*)/g
    while (param = regexp.exec(hash)) != null
      result[param[1]] = decodeURIComponent(param[2]).replace(/\+/g, " ")
    result

  setGeoState = ->
    if showGeo
      $searchCard.addClass("geolocated")
      findStops("")
    else
      showGeo = false
      $search.focus()

  if navigator && navigator.geolocation
    $geolocator.addClass("disabled")
    navigator.geolocation.getCurrentPosition((p) ->
      pos = { lat: p.coords.latitude, lon: p.coords.longitude }
      $geolocator.removeClass("disabled")
      setGeoState()
    )

  locationHash = getLocationHash()
  if locationHash && locationHash.id
    openStop(locationHash.id, locationHash.name, locationHash.subname)
    timer = setInterval(reload, 30000)
  else
    reset()

  $search.on("input paste focus", _.debounce(loadStops, 250))
  $(".reload").on("click", ->
    setLoading()
    reload()
  )
  $currentStop.on("click", reset)

  $geolocator.on("click", ->
    if pos
      if showGeo
        $searchCard.removeClass("geolocated")
        $search.focus()
      else
        $searchCard.addClass("geolocated")
        findStops("")
      showGeo = !showGeo
      $.cookie("showGeo", showGeo)
  )

  FastClick.attach(document.body)
