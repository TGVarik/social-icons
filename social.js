var width = 250,
    height = 250,
    padding = 1.5, // separation between nodes
    radius = 18;



var nodeData = function(){
  $.getJSON



}



var nodeData = [
    {
        service: 'twitter',
        url: 'https://twitter.com',
        icon: 'fa-twitter',
        radius: 18
    },
    {
        service: 'facebook',
        url: 'https://facebook.com',
        icon: 'fa-facebook',
        radius: 18
    }
];

// Use the pack layout to initialize node positions.
//d3.layout.pack()
//    .sort(null)
//    .size([width, height])
//    .children(function(d) { return d.values; })
//    .value(function(d) { return d.radius * d.radius; })
//    .nodes({values: d3.nest()
//      .key(function(d) { return d.cluster; })
//      .entries(nodes)});

var force = d3.layout.force()
    .nodes(nodeData)
    .size([width, height])
    .gravity(.2)
    .charge(0)
    .on("tick", tick)
    .start();

var svg = d3.select("body").append("svg")
    .attr({
      width: width,
      height: height,
      class: 'social'
    });

var node = svg
    .selectAll("g")
    .data(nodeData, function(d){return d.service;});

node
    .enter()
    .append('g')
    .attr('class', 'social-node')
    .call(force.drag);

var circle = node.selectAll('circle');
if (circle.empty()){
  circle = node
      .append('circle')
      .attr('class', 'social-node-circle');
}
var label = node.selectAll('text');
if (label.empty()){
  label = node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('class', function(d){return 'social-node-text fa fa-lg ' + d.icon;})
}

circle
    .transition()
    .duration(750)
    .delay(function(d, i) { return i * 50; })
    .attrTween("r", function(d) {
      var i = d3.interpolate(0, d.radius);
      return function(t) { 
        return d.radius = i(t); 
      };
    });

function tick(e) {
  var oldCenter = {
    cx: circle.attr('cx'),
    cy: circle.attr('cy')
  }
  circle
      .each(collide(.5));
  node
      .attr('transform', function(d){
        var dx = d.x - oldCenter.cx;
        var dy = d.y - oldCenter.cy;
        return 'translate(' + dx + ',' + dy + ')';
      });
}

// Move d to be adjacent to the cluster node.


// Resolves collisions between d and all other circles.
function collide(alpha) {
  var quadtree = d3.geom.quadtree(nodeData);
  return function(d) {
    var r = d.radius + radius + padding,
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + quad.point.radius + padding;
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
