$ -> 
  stopCardTemplate = _.template($("#stop-card-template").html())
  transportShortCardTemplate = _.template($("#transport-short-card-template").html())
  transportFullCardTemplate = _.template($("#transport-full-card-template").html())

  stopsCount = 15

  $body = $("body")
  $html = $("html")
  $page = $(".page-wrap")
  $search = $(".search")
  $searchCard = $(".search-card")
  $geolocator = $(".geolocator")
  $noContent = $(".no-content")
  $fullCard = null
  
  $results = $(".results")
  $geowrap = $(".geowrap")
  $transportTop = $(".transport-top")
  $currentStop = $(".current-stop")

  gateway = new Gateway();
  timer = new Timer(30000);
  showGeo = $.parseJSON($.cookie("showGeo") || false);
  pos = null

  setLoading = ->
    $results.empty().append($('<div class="item empty"></div>').text("Загружаю..."))

  pushStop = (id) ->
    stopsCookie = $.cookie("lastStops")
    lastStops = stopsCookie && $.parseJSON(stopsCookie) || []
    lastStops = _.reject(lastStops, id)
    lastStops.unshift(id)
    $.cookie("lastStops", JSON.stringify(lastStops.slice(0, stopsCount)), expires: 3560)

  clear = ->
    $(".stop-card").remove()
    timer.clear()

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

  removeFullCard = ->
    if ($fullCard)
      $fullCard.addClass("hidden")
      window.location.hash = "!/"
      setTimeout((->
        $fullCard.remove()
        $html.removeClass("overlayed")
      ), 250)

  showTransportFull = (transport) ->
    $fullCard = $(transportFullCardTemplate(transport))
    $fullCard.appendTo($body)
    $html.addClass("overlayed")
    window.location.hash = "!/full-card"
    setTimeout((-> $fullCard.removeClass("hidden")), 0)
    $fullCard.on("click", removeFullCard)

  showTransportShort = ->
    $this = $(this)
    $details = $this.next(".short-details")
    $transport = $details.find("ul.transport")
    stopId = $this.closest(".content-wrap").data("id")

    $details.toggleClass("hidden")
    $this.toggleClass("expanded")

    load = ->
      gateway.loadTransport(stopId, (transports) ->
        $transport.empty()
        $details.removeClass("loading")
        $details.removeClass("reloading")
        if (transports.length == 0)
          $details.addClass("empty")
        _.each(transports, (item) -> 
          $card = $(transportShortCardTemplate(item))
          $transport.append($card)
          $card.on("click", -> showTransportFull(item))
        )
      )

    if ($this.is(".expanded"))
      $transport.empty()
      $details.addClass("loading")
      $details.removeClass("empty")
      load()
      pushStop(stopId)
      timer.push(stopId, ->
        $details.addClass("reloading")
        load()
      )
    else
      timer.delete(stopId)

  displayStops = (stops) ->
    $noContent.addClass("hidden")
    clear()
    _.each(groupStops(stops), (stop, index) ->
      $card = $(stopCardTemplate(stop))
      $card.addClass("hidden")
      $card.find(".show-short").on("click", showTransportShort)
      window.setTimeout((-> $card.removeClass("hidden")), index*200)
      $page.append($card)
    )

  findStops = (name) ->
    gateway.loadStops(name, (stops) -> displayStops(normalizeStops(stops)))

  displayLastStops = ->
    stopsCookie = $.cookie("lastStops")
    if stopsCookie
      gateway.findStopsByIds($.parseJSON(stopsCookie), (stops) ->
        displayStops(normalizeStops(stops))
      )
    else
      clear()
      $noContent.removeClass("hidden")

  loadStops = ->
    value = $search.val()
    if value
      findStops(value)
    else
      displayLastStops()

  setGeoState = ->
    if showGeo
      $searchCard.addClass("geolocated")
      $search.attr("disabled", "disabled")
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

  $search.on("input paste focus", _.debounce(loadStops, 250))
  $(".reload").on("click", ->
    setLoading()
    reload()
  )

  $geolocator.on("click", ->
    if pos
      showGeo = !showGeo
      $.cookie("showGeo", showGeo)
      if showGeo
        $searchCard.addClass("geolocated")
        $search.attr("disabled", "disabled")
        findStops("")
      else
        $searchCard.removeClass("geolocated")
        $search.removeAttr("disabled")
        $search.focus()
  )

  $(window).bind("hashchange", ->
    if (window.location.hash == "" || window.location.hash == "#!/")
      removeFullCard()
  )

  FastClick.attach(document.body)
