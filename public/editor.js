$(function() {
  var $apply, $coords, $count, $hide, $results, $save, $search, apply, coords, displayStops, focusSearch, init, recount, save, selectStop, showStop, showStops, stopId;
  $search = $(".search");
  $results = $(".results");
  $coords = $(".coords");
  $apply = $(".apply");
  $save = $(".save");
  $count = $(".count");
  $hide = $(".hide-located");
  coords = {
    x: 0,
    y: 0
  };
  stopId = 0;
  showStop = function(stop) {
    var placemark;
    placemark = new ymaps.Placemark([stop.a, stop.o], {
      balloonContent: "<span class='name'>" + stop.n + "</span><br/><span class='desc'>" + stop.d + "</span>"
    }, {
      preset: 'islands#redCircleDotIcon'
    });
    return map.geoObjects.add(placemark);
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
  focusSearch = function() {
    $search.focus();
    return $search[0].setSelectionRange(0, $search.val().length);
  };
  selectStop = function($item) {
    $results.find(".selected").removeClass("selected");
    $item.addClass("selected");
    stopId = $item.data("id");
    return focusSearch();
  };
  save = function() {
    return console.log(JSON.stringify(stops, null, 2));
  };
  recount = function() {
    var i, located;
    located = 0;
    i = 0;
    while (i < stops.length) {
      if (stops[i].a && stops[i].o) {
        located++;
      }
      i++;
    }
    return $count.text(located + "/" + stops.length);
  };
  apply = function() {
    var i, stop;
    i = 0;
    while (i < stops.length) {
      stop = stops[i];
      if (stop.i.toString() === stopId.toString()) {
        stop.a = coords.x;
        stop.o = coords.y;
        showStop(stop);
        $results.find(".selected").addClass("geocoded");
      }
      i++;
    }
    recount();
    return focusSearch();
  };
  displayStops = function() {
    var $details, $item, field, i, regexp, results, search, stop;
    search = $search.val();
    regexp = new RegExp(search.replace(/ /g, ".*"), 'ig');
    field = search.match(/^на /i) ? "d" : "n";
    $results.empty();
    i = 0;
    results = [];
    while (i < stops.length) {
      stop = stops[i];
      if (stop[field].match(regexp)) {
        $item = $("<div></div>");
        $item.addClass("item");
        $item.text(stop.n);
        $item.data("id", stop.i);
        if (stop.a && stop.o) {
          $item.addClass("geocoded");
          if ($hide.is(":checked")) {
            $item.addClass("hidden");
          }
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
    map.events.add('click', function(e) {
      return map.setCenter(e.get('coords'));
    });
    return showStops();
  };
  ymaps.ready(init);
  $search.on("input paste", function() {
    return displayStops();
  });
  $apply.on("click", apply);
  $save.on("click", save);
  $(document).on("keypress", function(e) {
    if (e.charCode === 13) {
      return apply();
    }
  });
  return recount();
});
