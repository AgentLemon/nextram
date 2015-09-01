window.Gateway = function() {
  var fixLayout, humanTypes, layout, normalize, parseStops, parseTransport, self, stopsUrl, transportRegexp, transportUrl;
  self = this;
  stopsUrl = "http://tosamara.ru/poisk/stops.php";
  transportUrl = "http://tosamara.ru/xml_bridge.php";
  transportRegexp = /(<li class="trans-ico-([^"]+)".*class="trans-min-count">([^<]*).*class="trans-name">([^:]+):([^<]*).*class="trans-detail">([^<]*).*class="trans-detail">([^<]*))/gim;
  layout = [[/q/g, "й"], [/w/g, "ц"], [/e/g, "у"], [/r/g, "к"], [/t/g, "е"], [/y/g, "н"], [/u/g, "г"], [/i/g, "ш"], [/o/g, "щ"], [/p/g, "з"], [/\[|\{/g, "х"], [/\]|\}/g, "ъ"], [/a/g, "ф"], [/s/g, "ы"], [/d/g, "в"], [/f/g, "а"], [/g/g, "п"], [/h/g, "р"], [/j/g, "о"], [/k/g, "л"], [/l/g, "д"], [/;|:/g, "ж"], [/'|"/g, "э"], [/z/g, "я"], [/x/g, "ч"], [/c/g, "с"], [/v/g, "м"], [/b/g, "и"], [/n/g, "т"], [/m/g, "ь"], [/,|</g, "б"], [/\.|>/g, "ю"], [/`|~/g, "ё"]];
  humanTypes = {
    rail: "Трамвай",
    bus: "Автобус",
    trol: "Троллейбус"
  };
  normalize = function(str) {
    return str.replace(/\t|\r|\n/g, "").replace(/&nbsp;/g, " ");
  };
  fixLayout = function(str) {
    _.each(layout, function(chars) {
      return str = str.replace(chars[0], chars[1]);
    });
    return str;
  };
  parseStops = function(name) {
    var i, regexp, result, stop;
    result = [];
    regexp = new RegExp("(^|[^А-Яа-я0-9])" + name, "i");
    i = 0;
    while (i < stops.length) {
      stop = stops[i];
      if (stop.n.search(regexp) > -1) {
        result.push({
          id: stop.i,
          name: stop.n,
          subname: stop.d,
          lat: stop.a,
          lon: stop.o
        });
      }
      i++;
    }
    return result;
  };
  parseTransport = function(html) {
    var transport;
    transport = [];
    html = html.split(/<\/li>/);
    html.pop();
    window.s = html;
    transport = _.map(html, function(stopHtml) {
      var regexp, stop;
      regexp = new RegExp(transportRegexp);
      stop = regexp.exec(stopHtml);
      return {
        type: stop[2],
        est: stop[3],
        number: stop[4],
        route: stop[5],
        spec: stop[6],
        marker: stop[7],
        humanType: humanTypes[stop[2]]
      };
    });
    return transport;
  };
  self.loadStops = function(name, callback) {
    return callback(parseStops(fixLayout(name)));
  };
  self.loadTransport = function(stopId, callback) {
    return $.post(transportUrl, {
      method: "getFirstArrivalToStop",
      KS_ID: stopId,
      COUNT: 10,
      version: "mobile"
    }, function(response) {
      return callback(parseTransport(normalize(response)));
    });
  };
  return this;
};

$(function() {
  var $body, $currentStop, $fullCard, $geolocator, $geowrap, $html, $noContent, $page, $results, $search, $searchCard, $transportTop, clear, displayLastStops, displayStops, displayTransport, findStops, gateway, getDistance, getLocationHash, groupStops, lastStopId, loadStops, normalizeStops, openStop, pos, pushStop, reload, removeFullCard, reset, setGeoState, setLoading, showGeo, showTransportFull, showTransportShort, state, stopCardTemplate, stopsCount, timer, transportFullCardTemplate, transportShortCardTemplate;
  stopCardTemplate = _.template($("#stop-card-template").html());
  transportShortCardTemplate = _.template($("#transport-short-card-template").html());
  transportFullCardTemplate = _.template($("#transport-full-card-template").html());
  stopsCount = 15;
  $body = $("body");
  $html = $("html");
  $page = $(".page-wrap");
  $search = $(".search");
  $searchCard = $(".search-card");
  $geolocator = $(".geolocator");
  $noContent = $(".no-content");
  $fullCard = null;
  $results = $(".results");
  $geowrap = $(".geowrap");
  $transportTop = $(".transport-top");
  $currentStop = $(".current-stop");
  gateway = new Gateway();
  lastStopId = null;
  state = "stops";
  showGeo = $.parseJSON($.cookie("showGeo") || false);
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
  clear = function() {
    return $(".stop-card").remove();
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
  groupStops = function(stops) {
    var groupedStops, result;
    groupedStops = _.groupBy(stops, "name");
    result = [];
    _.each(groupedStops, function(substops, key) {
      var stop;
      stop = {
        title: key
      };
      stop["stops"] = _.map(substops, function(i) {
        var name;
        name = i.subname;
        if (i.distance) {
          name += " (" + i.distance + "&nbsp;м)";
        }
        return {
          name: name,
          id: i.id
        };
      });
      return result.push(stop);
    });
    return result;
  };
  removeFullCard = function() {
    if ($fullCard) {
      $fullCard.addClass("hidden");
      window.location.hash = "";
      return setTimeout((function() {
        $fullCard.remove();
        return $html.removeClass("overlayed");
      }), 250);
    }
  };
  showTransportFull = function(transport) {
    $fullCard = $(transportFullCardTemplate(transport));
    $fullCard.appendTo($body);
    $html.addClass("overlayed");
    window.location.hash = "full-card";
    setTimeout((function() {
      return $fullCard.removeClass("hidden");
    }), 0);
    return $fullCard.on("click", removeFullCard);
  };
  showTransportShort = function() {
    var $details, $this, $transport, stopId;
    $this = $(this);
    $details = $this.next(".short-details");
    $transport = $details.find("ul.transport");
    stopId = $this.closest(".content-wrap").data("id");
    $details.toggleClass("hidden");
    $this.toggleClass("expanded");
    if ($this.is(".expanded")) {
      $transport.empty();
      $details.addClass("loading");
      $details.removeClass("empty");
      return gateway.loadTransport(stopId, function(transports) {
        $details.removeClass("loading");
        if (transports.length === 0) {
          $details.addClass("empty");
        }
        return _.each(transports, function(item) {
          var $card;
          $card = $(transportShortCardTemplate(item));
          $transport.append($card);
          return $card.on("click", function() {
            return showTransportFull(item);
          });
        });
      });
    }
  };
  displayStops = function(stops) {
    if (state === "stops") {
      $noContent.addClass("hidden");
      clear();
      return _.each(groupStops(stops), function(stop, index) {
        var $card;
        $card = $(stopCardTemplate(stop));
        $card.addClass("hidden");
        $card.find(".show-short").on("click", showTransportShort);
        window.setTimeout((function() {
          return $card.removeClass("hidden");
        }), index * 200);
        return $page.append($card);
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
    } else {
      clear();
      return $noContent.removeClass("hidden");
    }
  };
  reset = function() {
    state = "stops";
    clearInterval(timer);
    $results.empty();
    $search.closest(".item").show();
    $transportTop.hide();
    $currentStop.hide();
    window.location.hash = "";
    if (pos) {
      $geolocator.show();
      return setGeoState();
    } else {
      return $search.focus();
    }
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
  setGeoState = function() {
    if (showGeo) {
      $searchCard.addClass("geolocated");
      $search.attr("disabled", "disabled");
      return findStops("");
    } else {
      showGeo = false;
      return $search.focus();
    }
  };
  if (navigator && navigator.geolocation) {
    $geolocator.addClass("disabled");
    navigator.geolocation.getCurrentPosition(function(p) {
      pos = {
        lat: p.coords.latitude,
        lon: p.coords.longitude
      };
      $geolocator.removeClass("disabled");
      return setGeoState();
    });
  }
  $search.on("input paste focus", _.debounce(loadStops, 250));
  $(".reload").on("click", function() {
    setLoading();
    return reload();
  });
  $currentStop.on("click", reset);
  $geolocator.on("click", function() {
    if (pos) {
      showGeo = !showGeo;
      $.cookie("showGeo", showGeo);
      if (showGeo) {
        $searchCard.addClass("geolocated");
        $search.attr("disabled", "disabled");
        return findStops("");
      } else {
        $searchCard.removeClass("geolocated");
        $search.removeAttr("disabled");
        return $search.focus();
      }
    }
  });
  $(window).bind("hashchange", function() {
    if (window.location.hash === "") {
      return removeFullCard();
    }
  });
  return FastClick.attach(document.body);
});
