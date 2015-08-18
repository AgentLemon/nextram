window.Gateway = function() {
  var fixLayout, layout, normalize, parseStops, parseTransport, self, stopsUrl, transportRegexp, transportUrl;
  self = this;
  stopsUrl = "http://tosamara.ru/poisk/stops.php";
  transportUrl = "http://tosamara.ru/xml_bridge.php";
  transportRegexp = /(<li class="trans-ico-([^"]+)".*class="trans-min-count">([^<]*).*class="trans-name">([^:]+):([^<]*).*class="trans-detail">([^<]*).*class="trans-detail">([^<]*))/gim;
  layout = [[/q/g, "й"], [/w/g, "ц"], [/e/g, "у"], [/r/g, "к"], [/t/g, "е"], [/y/g, "н"], [/u/g, "г"], [/i/g, "ш"], [/o/g, "щ"], [/p/g, "з"], [/\[|\{/g, "х"], [/\]|\}/g, "ъ"], [/a/g, "ф"], [/s/g, "ы"], [/d/g, "в"], [/f/g, "а"], [/g/g, "п"], [/h/g, "р"], [/j/g, "о"], [/k/g, "л"], [/l/g, "д"], [/;|:/g, "ж"], [/'|"/g, "э"], [/z/g, "я"], [/x/g, "ч"], [/c/g, "с"], [/v/g, "м"], [/b/g, "и"], [/n/g, "т"], [/m/g, "ь"], [/,|</g, "б"], [/\.|>/g, "ю"], [/`|~/g, "ё"]];
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
    regexp = new RegExp(name, "i");
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
        route: stop[5].replace("→", "→<br/>"),
        spec: stop[6],
        marker: stop[7]
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
