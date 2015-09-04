$(function() {
  var $apply, $coords, $results, $save, $search, apply, coords, displayStops, init, save, selectStop, showStop, showStops, stopId;
  $search = $(".search");
  $results = $(".results");
  $coords = $(".coords");
  $apply = $(".apply");
  $save = $(".save");
  coords = {
    x: 0,
    y: 0
  };
  stopId = 0;
  showStop = function(stop) {
    var obj;
    obj = new ymaps.GeoObject({
      geometry: {
        type: "Point",
        coordinates: [stop.a, stop.o]
      }
    });
    return map.geoObjects.add(obj);
  };
  showStops = function() {
    var i, results, stop;
    i = 0;
    results = [];
    while (i < stops.length) {
      stop = stops[i];
      if (stop.a && stop.o) {
        showStop(stop);
      }
      results.push(i++);
    }
    return results;
  };
  selectStop = function($item) {
    $results.find(".selected").removeClass("selected");
    $item.addClass("selected");
    return stopId = $item.data("id");
  };
  save = function() {
    return console.log(JSON.stringify(stops, null, 2));
  };
  apply = function() {
    var i, results, stop;
    i = 0;
    results = [];
    while (i < stops.length) {
      stop = stops[i];
      if (stop.i.toString() === stopId.toString()) {
        stop.a = coords.x;
        stop.o = coords.y;
        showStop(stop);
        $results.find(".selected").addClass("geocoded");
      }
      results.push(i++);
    }
    return results;
  };
  displayStops = function() {
    var $details, $item, i, regexp, results, search, stop;
    search = $search.val();
    regexp = new RegExp(search, 'ig');
    $results.empty();
    i = 0;
    results = [];
    while (i < stops.length) {
      stop = stops[i];
      if (stop.n.match(regexp)) {
        $item = $("<div></div>");
        $item.addClass("item");
        $item.text(stop.n);
        $item.data("id", stop.i);
        if (stop.a && stop.o) {
          $item.addClass("geocoded");
        }
        $item.on("click", function() {
          return selectStop($(this));
        });
        $details = $("<div></div>");
        $details.text(stop.d);
        $details.addClass("details");
        $details.appendTo($item);
        $results.append($item);
      }
      results.push(i++);
    }
    return results;
  };
  init = function() {
    window.map = new ymaps.Map("map", {
      center: [53.2004, 50.1784],
      zoom: 17
    });
    map.setType('yandex#publicMap');
    map.events.add('boundschange', function() {
      var center;
      center = map.getCenter();
      coords = {
        x: Math.round(center[0] * 1000000) / 1000000,
        y: Math.round(center[1] * 1000000) / 1000000
      };
      return $coords.text(coords.x + " : " + coords.y);
    });
    return showStops();
  };
  ymaps.ready(init);
  $search.on("input paste", function() {
    return displayStops();
  });
  $apply.on("click", apply);
  return $save.on("click", save);
});
