$( -> 

  $search = $(".search")
  $results = $(".results")
  $coords = $(".coords")
  $apply = $(".apply")
  $save = $(".save")
  coords = { x: 0, y: 0 }
  stopId = 0

  showStop = (stop) ->
    obj = new ymaps.GeoObject(
      geometry:
        type: "Point",
        coordinates: [stop.a, stop.o]
    )
    map.geoObjects.add(obj)

  showStops = ->
    i = 0
    while (i < stops.length)
      stop = stops[i]
      if (stop.a && stop.o)
        showStop(stop)
      i++

  focusSearch = ->
    $search.focus()
    $search[0].setSelectionRange(0, $search.val().length)

  selectStop = ($item) ->
    $results.find(".selected").removeClass("selected")
    $item.addClass("selected")
    stopId = $item.data("id")
    focusSearch()

  save = ->
    console.log(JSON.stringify(stops, null, 2))

  apply = ->
    i = 0
    while (i < stops.length)
      stop = stops[i]
      if (stop.i.toString() == stopId.toString())
        stop.a = coords.x
        stop.o = coords.y
        showStop(stop)
        $results.find(".selected").addClass("geocoded")
      i++
    focusSearch()
  
  displayStops = ->
    search = $search.val()
    regexp = new RegExp(search.replace(/ /g, ".*"), 'ig')
    $results.empty()
    i = 0
    while (i < stops.length)
      stop = stops[i]
      if (stop.n.match(regexp))
        $item = $("<div></div>")
        $item.addClass("item")
        $item.text(stop.n)
        $item.data("id", stop.i)
        if (stop.a && stop.o)
          $item.addClass("geocoded")
        $item.on("click", -> selectStop($(this)))
        
        $details = $("<div></div>")
        $details.text(stop.d)
        $details.addClass("details")
        $details.appendTo($item)
        
        $results.append($item)
      i++

  init = ->
    window.map = new ymaps.Map("map",
      center: [53.2004, 50.1784],
      zoom: 17
    )

    map.setType('yandex#publicMap')

    map.events.add('boundschange', ->
      center = map.getCenter()
      coords = { x: Math.round(center[0] * 1000000) / 1000000, y: Math.round(center[1] * 1000000) / 1000000 }
      $coords.text("#{coords.x} : #{coords.y}")
    )

    map.events.add('click', (e) ->
      map.setCenter(e.get('coords'))
    )

    showStops()

  ymaps.ready(init)

  $search.on("input paste", -> displayStops())
  $apply.on("click", apply)
  $save.on("click", save)
  $(document).on("keypress", (e) ->
    if (e.charCode == 13)
      apply()
  )
)
