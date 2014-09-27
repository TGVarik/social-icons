// wrap in module!!
var width = 250,
    height = 250,
    padding = 1.5, // separation between nodes
    radius = 18;

var init = function (data) {
  $.getJSON('social.json', function(extend){
    for (var key in data) {
      if (data[key].user === undefined) {
        delete data[key];
      } else {
        _.extend(data[key], extend[key]);
        data[key].url = _.template(data[key].url)(data[key]);
        data[key].radius = {min: radius, max: radius * 1.5, cur: radius};
      }
    }
    socialWidget(data);
  });
};

var socialWidget = function(nodeData) {
// Use the pack layout to initialize node positions.
//d3.layout.pack()
//    .sort(null)
//    .size([width, height])
//    .children(function(d) { return d.values; })
//    .value(function(d) { return d.radius * d.radius; })
//    .nodes({values: d3.nest()
//      .key(function(d) { return d.service; })
//      .entries(nodes)});

  var t = _.template('translate(-<%= cur %>,-<%= cur %>),scale(<% print(cur/100); %>)');

  var arr = [];
  for (var key in nodeData){
    nodeData[key].service = key;
    arr.push(nodeData[key]);
  };
  nodeData = arr;

  var force = d3.layout.force()
      .nodes(nodeData)
      .size([width, height])
      .charge(0)
      .gravity(0.09)
      .on("tick", tick)
      .start();

  var svg = d3.select("body").append("svg")
      .attr({
        width : width,
        height: height,
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
      .attr('class', 'social-node')
      .call(force.drag);

  var resize = function(d){


    d3.select(this).select('circle')
        .transition()
        .duration(750)
        .ease('elastic')
        .attr('r', d.radius.cur);
    d3.select(this).select('path')
        .transition()
        .duration(750)
        .ease('elastic')
        .attr('transform', function(d){return t(d.radius);});
  };

  var onMouseEnter = function(d){
    force.start();
    d.radius.cur = d.radius.max;
    resize.call(this, d);
  };

  var onMouseLeave = function(d){
    force.start();
    d.radius.cur = d.radius.min;
    resize.call(this, d);
  };
  node
      .on('mouseenter', onMouseEnter, this)
      .on('mouseleave', onMouseLeave, this)
      .on('click', function(d){
        if (!d3.event.defaultPrevented) {
          window.open(d.url, '_blank');
        }
      });

  var circle = node.selectAll('circle');
  if (circle.empty()) {
    circle = node
        .append('circle')
        .attr('class', function(d){return 'social-node-circle ' + d.service;})
        .attr('fill', function(d){return d.color;});
  }
  var icon = node.selectAll('path');
  if (icon.empty()) {
    icon = node
        .append('path')
        .attr('d', function(d){return d.path;})
        .attr('fill', 'white')
        .attr('class', function(d){return 'social-node-icon ' + d.service;})
        .attr('transform', function(d){return t(d.radius);});
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

  function tick(e) {

    var oldCenter = {
      cx: circle.empty() ? 0: circle.attr('cx'),
      cy: circle.empty() ? 0: circle.attr('cy')
    };

    circle
        .each(collide(.5));

    node
        .attr('transform', function (d) {
          var dx = Math.max(d.radius.cur, Math.min(width - d.radius.cur, d.x)) - oldCenter.cx;
          var dy = Math.max(d.radius.cur, Math.min(height - d.radius.cur, d.y)) - oldCenter.cy;
          return 'translate(' + dx + ',' + dy + ')';
        });

  }

// Move d to be adjacent to the cluster node.

// Resolves collisions between d and all other circles.
  function collide(alpha) {
    var quadtree = d3.geom.quadtree(nodeData);
    return function (d) {
      var r = d.radius.cur + radius + padding,
          nx1 = d.x - r,
          nx2 = d.x + r,
          ny1 = d.y - r,
          ny2 = d.y + r;
      quadtree.visit(function (quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== d)) {
          var x = d.x - quad.point.x,
              y = d.y - quad.point.y,
              l = Math.sqrt(x * x + y * y),
              r = d.radius.cur + quad.point.radius.cur + padding;
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