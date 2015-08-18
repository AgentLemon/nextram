$(function() {
  var $currentStop, $geolocator, $results, $search, $transportTop, displayLastStops, displayStops, displayTransport, findStops, gateway, getDistance, getLocationHash, lastStopId, loadStops, locationHash, normalizeStops, openStop, pos, pushStop, reload, reset, setLoading, state, stopsCount, timer;
  stopsCount = 15;
  $search = $(".find-stop");
  $results = $(".results");
  $transportTop = $(".transport-top");
  $currentStop = $(".current-stop");
  $geolocator = $(".geolocator");
  gateway = new Gateway();
  lastStopId = null;
  state = "stops";
  timer = null;
  pos = null;
  setLoading = function() {
    return $results.empty().append($('<div class="item empty"></div>').text("Загружаю..."));
  };
  pushStop = function(id, name, subname, lat, lon) {
    var stops, stopsCookie;
    stopsCookie = $.cookie("lastStops");
    stops = stopsCookie && $.parseJSON(stopsCookie) || [];
    stops = _.reject(stops, function(stop) {
      return !stop || stop.id === id;
    });
    stops.unshift({
      id: id,
      name: name,
      subname: subname,
      lat: lat,
      lon: lon
    });
    return $.cookie("lastStops", JSON.stringify(stops.slice(0, 10)), {
      expires: 356
    });
  };
  openStop = function(stopId, name, subname, store, lat, lon) {
    $geolocator.hide();
    lastStopId = stopId;
    state = "transport";
    gateway.loadTransport(stopId, function(transport) {
      return displayTransport(transport);
    });
    if (name && subname) {
      setLoading();
      $transportTop.show();
      $search.closest(".item").hide();
      $currentStop.show();
      $currentStop.find(".name").text(name);
      $currentStop.find(".subname").text(subname);
    }
    if (store) {
      window.location.hash = $.param({
        id: stopId,
        name: name,
        subname: subname,
        lat: lat,
        lon: lon
      });
      return pushStop(stopId, name, subname, lat, lon);
    }
  };
  reload = function() {
    if (lastStopId) {
      return openStop(lastStopId);
    }
  };
  getDistance = function(lat, lon) {
    var dist, radlat1, radlat2, radlon1, radlon2, radtheta, theta;
    radlat1 = Math.PI * lat / 180;
    radlat2 = Math.PI * pos.lat / 180;
    radlon1 = Math.PI * lon / 180;
    radlon2 = Math.PI * pos.lon / 180;
    theta = lon - pos.lon;
    radtheta = Math.PI * theta / 180;
    dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    dist = dist * 1609.344;
    return Math.round(dist);
  };
  normalizeStops = function(stops) {
    _.each(stops, function(stop) {
      if (pos && stop.lat && stop.lon) {
        return stop.distance = getDistance(stop.lat, stop.lon);
      }
    });
    stops = _.sortBy(stops, function(s) {
      if (s.distance) {
        return s.distance;
      } else {
        return 100000;
      }
    });
    return stops.slice(0, stopsCount);
  };
  displayStops = function(stops) {
    if (state === "stops") {
      $results.empty();
      return _.each(stops, function(stop) {
        var $item, $name, $subname;
        $item = $('<div class="item stop"></div>');
        $name = $('<div class="name"></div>').text(stop.name);
        $subname = $('<div class="subname"></div>').text(stop.subname);
        if (stop.distance) {
          $subname.append(" (" + stop.distance + "m)");
        }
        $item.append($name).append($subname);
        $item.on("click", function() {
          openStop(stop.id, stop.name, stop.subname, true, stop.lat, stop.lon);
          return timer = setInterval(reload, 30000);
        });
        return $results.append($item);
      });
    }
  };
  displayTransport = function(transport) {
    if (state === "transport") {
      $results.empty();
      if (transport.length > 0) {
        return _.each(transport, function(trans) {
          var $est, $item, $marker, $route, $spec;
          $item = $('<div class="item transport"></div>').addClass(trans.type);
          $est = $('<div class="est"></div>').append($('<div class="icon"></div>')).append($("<span></span>").addClass("est-time").text(trans.est)).append(" мин");
          $route = $('<div class="route"></div>').append($("<span/>").addClass("route").html(trans.route)).prepend($("<span></span>").addClass("number").text(trans.number));
          $spec = $('<div class="spec"></div>').text(trans.spec);
          $marker = $('<div class="marker"></div>').text(trans.marker);
          $item.append($est).append($route).append($spec).append($marker);
          return $results.append($item);
        });
      } else {
        return $results.append($('<div class="item empty"></div>').text("Пусто :-("));
      }
    }
  };
  findStops = function(name) {
    lastStopId = null;
    $transportTop.hide();
    return gateway.loadStops(name, function(stops) {
      return displayStops(normalizeStops(stops));
    });
  };
  displayLastStops = function() {
    var stopsCookie;
    stopsCookie = $.cookie("lastStops");
    if (stopsCookie) {
      return displayStops(normalizeStops($.parseJSON(stopsCookie)));
    }
  };
  reset = function() {
    state = "stops";
    clearInterval(timer);
    $results.empty();
    $search.closest(".item").show();
    $search.val("");
    $search.focus();
    $transportTop.hide();
    $currentStop.hide();
    if (pos) {
      $geolocator.show();
    }
    window.location.hash = "";
    return displayLastStops();
  };
  loadStops = function() {
    var value;
    value = $search.val();
    if (value) {
      return findStops(value);
    } else {
      return displayLastStops();
    }
  };
  getLocationHash = function() {
    var hash, param, regexp, result;
    hash = window.location.hash;
    result = {};
    regexp = /[#&]?([^=]*)=([^&$]*)/g;
    while ((param = regexp.exec(hash)) !== null) {
      result[param[1]] = decodeURIComponent(param[2]).replace(/\+/g, " ");
    }
    return result;
  };
  if (navigator && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(p) {
      pos = {
        lat: p.coords.latitude,
        lon: p.coords.longitude
      };
      return $geolocator.show();
    });
  }
  locationHash = getLocationHash();
  if (locationHash && locationHash.id) {
    openStop(locationHash.id, locationHash.name, locationHash.subname);
    timer = setInterval(reload, 30000);
  } else {
    reset();
  }
  $search.on("keyup", _.debounce(loadStops, 250));
  $(".reload").on("click", function() {
    setLoading();
    return reload();
  });
  $currentStop.on("click", reset);
  $geolocator.on("click", function() {
    return findStops("");
  });
  return FastClick.attach(document.body);
});
