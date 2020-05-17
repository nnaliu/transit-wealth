var width = 960,
  height = 500;
var colorLight = "#f7fbff", // "#f7fbff"
    colorDark = "#08306b"; // "#08306b"

// Median Income (min: 11000 max: 160000)
var domainMin = 11000,
    domainMax = 160000

// Fix color
var color = d3.scaleLinear()
  .domain([domainMin, domainMax])
  .range([colorLight, colorDark]);

// Create a unit projection.
var projection = d3.geoAlbersUsa();
// Create a path generator.
var path = d3.geoPath(projection);

var svg = d3.select("#map svg")
  .attr("width", width)
  .attr("height", height);

// tooltips
var tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", "0");

// Promises
var promises = 
  [
    d3.json("./data/philly/philly.json"),
    d3.json("./data/philly/septa_paths.json")
  ]

myPromises = Promise.all(promises);

myPromises.then(function (data) {
  cityShapes = data[0];
  pathShapes = data[1];
  // pathColors = data[2];

  // visualize tracts
  var tractsGeo = topojson.feature(cityShapes, cityShapes.objects.tracts);
  projection.fitExtent([[0, 0], [width, height]], tractsGeo);

  svg.append("g")
      .attr("class", "tracts")
    .selectAll("path")
      .data(tractsGeo.features)
    .enter().append("path")
      .attr("d", path)
      .attr("stroke-width", "0.5px")
      .attr("stroke", "white")
      .attr("fill", function (d) {
        try {
          return color(d.properties.income); }
        catch (e) { return colorLight; }
      })
      .on("mouseover", function (d) {
        tooltip.transition()
        .duration(250)
        tooltip.style("opacity", "1");
        tooltip.html("<p><strong>Median Income: " + d.properties.income + "</strong></p>")
        .style("left", (d3.event.pageX + 15) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition()
        .duration(250)
        tooltip.style("opacity", "0");
      });

  // visualize public transit paths
  for (const value of Object.values(pathShapes.objects)) {
    objectGeo = topojson.feature(pathShapes, value)

    if (objectGeo.features.length > 100) { continue; }

    svg.append("g")
      .attr("class", "lines")
    .selectAll("path")
      .data(objectGeo.features)
    .enter().append("path")
      .attr("d", path)
      .attr("stroke-width", "1px")
      .attr("fill", "none")
      .attr("stroke", "green");
  }
})
.catch( function (error) {
  console.log(error);
});