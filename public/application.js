window.Gateway = function() {
  var fixLayout, humanTypes, layout, normalize, parseStops, parseTransport, self, stopsUrl, transportRegexp, transportUrl, unpackStop;
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
  unpackStop = function(stop) {
    return {
      id: stop.i,
      name: stop.n,
      subname: stop.d,
      lat: stop.a,
      lon: stop.o
    };
  };
  parseStops = function(name) {
    var i, regexp, result, stop;
    result = [];
    regexp = new RegExp("(^|[^А-Яа-я0-9])" + name, "i");
    i = 0;
    while (i < stops.length) {
      stop = stops[i];
      if (stop.n.search(regexp) > -1) {
        result.push(unpackStop(stop));
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
  self.findStopsByIds = function(ids, callback) {
    var i, j, result, stop;
    result = [];
    i = 0;
    ids = _.map(ids, function(i) {
      return i.toString();
    });
    while (i < stops.length) {
      stop = stops[i];
      j = 0;
      if (ids.indexOf(stop.i) > -1) {
        result.push(unpackStop(stop));
      }
      i++;
    }
    return callback(result);
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
  var $body, $currentStop, $fullCard, $geolocator, $geowrap, $html, $noContent, $page, $results, $search, $searchCard, $transportTop, clear, displayLastStops, displayStops, findStops, gateway, getDistance, groupStops, loadStops, normalizeStops, pos, pushStop, removeFullCard, setGeoState, showGeo, showTransportFull, showTransportShort, stopCardTemplate, stopsCount, timer, transportFullCardTemplate, transportShortCardTemplate;
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
  timer = new Timer(30000);
  showGeo = $.parseJSON($.cookie("showGeo") || false);
  pos = null;
  pushStop = function(id) {
    var lastStops, stopsCookie;
    stopsCookie = $.cookie("lastStops");
    lastStops = stopsCookie && $.parseJSON(stopsCookie) || [];
    lastStops = _.reject(lastStops, id);
    lastStops.unshift(id);
    return $.cookie("lastStops", JSON.stringify(lastStops.slice(0, stopsCount)), {
      expires: 3560
    });
  };
  clear = function() {
    $(".stop-card").remove();
    return timer.clear();
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
  removeFullCard = function(ignoreHistory) {
    if ($fullCard) {
      $fullCard.addClass("hidden");
      if (!ignoreHistory) {
        history.pushState(null, document.title, "");
      }
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
    history.pushState({
      transport: transport
    }, document.title, "");
    setTimeout((function() {
      return $fullCard.removeClass("hidden");
    }), 0);
    return $fullCard.on("click", removeFullCard);
  };
  showTransportShort = function() {
    var $details, $this, $transport, load, stopId;
    $this = $(this);
    $details = $this.next(".short-details");
    $transport = $details.find("ul.transport");
    stopId = $this.closest(".content-wrap").data("id");
    $details.toggleClass("hidden");
    $this.toggleClass("expanded");
    load = function() {
      return gateway.loadTransport(stopId, function(transports) {
        $transport.empty();
        $details.removeClass("loading");
        $details.removeClass("reloading");
        if (transports.length === 0) {
          $details.addClass("empty");
        }
        if (transports.length > 4) {
          $details.addClass("see-more");
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
    };
    if ($this.is(".expanded")) {
      $transport.empty();
      $details.addClass("loading");
      $details.removeClass("empty");
      load();
      pushStop(stopId);
      return timer.push(stopId, function() {
        $details.addClass("reloading");
        return load();
      });
    } else {
      return timer["delete"](stopId);
    }
  };
  displayStops = function(stops) {
    $noContent.addClass("hidden");
    clear();
    return _.each(groupStops(stops), function(stop, index) {
      var $card;
      $card = $(stopCardTemplate(stop));
      $card.find(".show-short").on("click", showTransportShort);
      $card.find("ul.transport").on("scroll", function(e) {
        var $this;
        $this = $(this);
        if (this.scrollWidth <= $this.scrollLeft() + $this.width()) {
          return $this.closest(".short-details").removeClass("see-more");
        }
      });
      return $page.append($card);
    });
  };
  findStops = function(name) {
    return gateway.loadStops(name, function(stops) {
      return displayStops(normalizeStops(stops));
    });
  };
  displayLastStops = function() {
    var stopsCookie;
    stopsCookie = $.cookie("lastStops");
    if (stopsCookie) {
      return gateway.findStopsByIds($.parseJSON(stopsCookie), function(stops) {
        return displayStops(normalizeStops(stops));
      });
    } else {
      clear();
      return $noContent.removeClass("hidden");
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
  setGeoState = function() {
    if (showGeo) {
      $searchCard.addClass("geolocated");
      $search.attr("disabled", "disabled");
      return findStops("");
    } else {
      showGeo = false;
      $search.focus();
      return loadStops();
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
  $search.on("input paste", _.debounce(loadStops, 250));
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
        $search.focus();
        return loadStops();
      }
    }
  });
  window.onpopstate = function(e) {
    return removeFullCard(true);
  };
  return FastClick.attach(document.body);
});

window.Timer = function(interval) {
  var count, functions, self, startTimer, stopTimer, tick, timer;
  interval || (interval = 30000);
  self = this;
  functions = {};
  timer = null;
  count = 0;
  tick = function() {
    var func, key, results;
    results = [];
    for (key in functions) {
      func = functions[key];
      results.push(func());
    }
    return results;
  };
  startTimer = function() {
    return timer = setInterval(tick, interval);
  };
  stopTimer = function() {
    return clearInterval(timer);
  };
  self.clear = function() {
    functions = {};
    count = 0;
    return stopTimer();
  };
  self.push = function(id, func) {
    functions[id] = func;
    count++;
    if (count === 1) {
      return startTimer();
    }
  };
  self["delete"] = function(id) {
    delete functions[id];
    count--;
    if (count === 0) {
      return stopTimer();
    }
  };
  return this;
};
