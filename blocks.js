// wrap in module!!

var context;
var init = function () {

  $.getJSON("config.json", function (data) {
    $.getJSON("blocks.json", function (extend) {
      for (var key in data.accounts) {
        if (data.accounts[key].user === undefined || data.accounts[key].user === '') {
          delete data.accounts[key];
        } else {
          _.extend(data.accounts[key], extend[key]);
          data.accounts[key].url = _.template(data.accounts[key].url)(data.accounts[key]);
          data.accounts[key].radius = {min: data.radius, max: data.radius * 1.5, cur: data.radius};
        }
      }
      socialWidget(data);
    });
  })
};


var socialWidget = function(data) {
  var playPop = undefined;
  var initializeAudio = function() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      var context = new AudioContext();
      var loadPop = function () {
        var req = new XMLHttpRequest();
        req.open('GET', './pop.wav', true);
        req.responseType = 'arraybuffer';
        req.onload = function () {
          context.decodeAudioData(req.response, function (buf) {
            playPop = function () {
              var src = context.createBufferSource();
              src.buffer = buf;
              src.connect(context.destination);
              src.start();
            };
          });
        };
        req.send();
      };
      loadPop();
    } catch (e) {
      console.log(e);
      playPop = undefined;
    }
  };
  if (data.sound){
    initializeAudio();
  }
  var t = _.template('translate(-<%= cur %>,-<%= cur %>),scale(<% print(cur/100); %>)');

  var resize = function(d){
    d3.select(this).select('circle')
        .transition()
        .duration(750)
        .ease('elastic')
        .attr('r', d.radius.cur);
    d3.select(this).select('.social-node-icon')
        .transition()
        .duration(750)
        .ease('elastic')
        .attr('transform', t(d.radius));
  };

  var onMouseEnter = function(d){
    force.start();
    d.radius.cur = d.radius.max;
    resize.call(this.parentNode, d);
    if (playPop){
      playPop()
    }
  };

  var onMouseLeave = function(d){
    force.start();
    d.radius.cur = d.radius.min;
    resize.call(this.parentNode, d);
  };

  var nodeData = [];
  for (var key in data.accounts){
    data.accounts[key].service = key;
    nodeData.push(data.accounts[key]);
  }

  var force = d3.layout.force()
      .nodes(nodeData)
      .size([data.width, data.height])
      .charge(data.charge)
      .gravity(data.gravity)
      .on("tick", tick)
      .start();

  var svg = d3.select(".social-blocks").append("svg")
      .attr({
        width : data.width,
        height: data.height,
        class : 'social'
      });

  var node = svg
      .selectAll("g")
      .data(nodeData, function (d) {
        return d.url;
      });

  node
      .enter()
      .append('g')
      .attr('class', function(d){return 'social-node ' + d.service;})
      .call(force.drag);

  var circle = node.selectAll('circle');

  if (circle.empty()) {
    circle = node
        .append('circle')
        .attr('class', 'social-node-circle')
        .attr('fill', function(d){return data.invert ? data.baseColor : d.color;});
  }

  circle
      .on('mouseenter', onMouseEnter)
      .on('mouseleave', onMouseLeave)
      .on('click', function(d){
        if (!d3.event.defaultPrevented) {
          window.open(d.url, '_blank');
        }
      });

  var icon = node.selectAll('.social-node-icon');

  if (icon.empty()) {
    icon = node
        .append('g')
        .attr({
          'transform': function(d){ return t({cur:0}); },
          'class': 'social-node-icon'
        });
    icon
        .append('path')
        .attr('d', function(d){return d.path;})
        .attr('fill', function(d){return data.invert ? d.color : 'white'});

    icon
        .filter(function(d){ return d.service === 'flickr'; })
        .selectAll('.subcircle')
        .data(function(d) { return d.circles; })
        .enter()
        .append('path')
        .attr({
          'd': function(d){ return d.path; },
          'fill': function(d){ return data.invert ? d.inverted : d.color; },
          'class': 'subcircle'
        });
  }

  circle
      .transition()
      .duration(750)
      .delay(function (d, i) {
        return i * 75;
      })
      .attrTween("r", function (d) {
        var i = d3.interpolate(0, d.radius.cur);
        return function (t) {
          return d.radius.cur = i(t);
        };
  });

  icon
      .transition()
      .duration(750)
      .delay(function (d, i){
        return i * 75;
      })
      .attrTween('transform', function(d){
        var i = d3.interpolate(t({cur:0}), t(d.radius));
        return function(t){
          return i(t);
        };
  });

  function tick(e) {

    var oldCenter = {
      cx: circle.empty() ? 0: circle.attr('cx'),
      cy: circle.empty() ? 0: circle.attr('cy')
    };

    circle
        .each(collide(.5));

    node
        .attr('transform', function (d) {
          var dx = Math.max(d.radius.cur, Math.min(data.width - d.radius.cur, d.x)) - oldCenter.cx;
          var dy = Math.max(d.radius.cur, Math.min(data.height - d.radius.cur, d.y)) - oldCenter.cy;
          return 'translate(' + dx + ',' + dy + ')';
        });

  }

// Move d to be adjacent to the cluster node.

// Resolves collisions between d and all other circles.
  function collide(alpha) {
    var quadtree = d3.geom.quadtree(nodeData);
    return function (d) {
      var r = d.radius.cur + data.radius + data.padding,
          nx1 = d.x - r,
          nx2 = d.x + r,
          ny1 = d.y - r,
          ny2 = d.y + r;
      quadtree.visit(function (quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== d)) {
          var x = d.x - quad.point.x,
              y = d.y - quad.point.y,
              l = Math.sqrt(x * x + y * y),
              r = d.radius.cur + quad.point.radius.cur + data.padding;
          if (l < r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    };
  }
};