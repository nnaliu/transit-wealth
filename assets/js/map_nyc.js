var width = 960,
    height = 500;
var colorLight = "#f7fbff",
    colorDark = "#08306b";

// IncomePerCap (min: 2440 max: 254204)
// Income (min: 9829 max: 244375)
// Poverty (min: 0 max: 100)
var domainMin = 2440,
    domainMax = 254204

// Fix color
var color = d3.scaleSqrt()
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
    d3.json("./data/nyc/nyc.json"),
    d3.json("./data/nyc/nyc_metro_paths.json"),
    d3.json("./data/nyc/nyc_metro_colors.json"),
    d3.csv("./data/nyc/nyc_census.csv"),
  ]

myPromises = Promise.all(promises);

myPromises.then(function (data) {
  cityShapes = data[0];
  pathShapes = data[1];
  pathColors = data[2];
  censusData = data[3];

  dataById = d3.nest()
    .key(function(d) { return d.CensusTract; })
    .rollup(function(d) { return d[0]; })
    .map(censusData);

  // visualize tracts
  var tractsGeo = topojson.feature(cityShapes, cityShapes.objects.tracts);
  projection.fitExtent([[0, 0], [width, height]], tractsGeo);

  var tracts = svg.append("g")
      .attr("class", "tracts")
    .selectAll("path")
      .data(tractsGeo.features)
    .enter().append("path")
      .attr("d", path)
      .attr("fill", function (d) {
        try { return color(dataById["$" + d.properties.geoid]['IncomePerCap']); }
        catch (e) { return colorLight; }
      })
      .on("mouseover", function (d) {
        tooltip.transition()
        .duration(250)
        tooltip.style("opacity", "1");
        tooltip.html("<p><strong>Median Income: " + dataById["$" + d.properties.geoid]['IncomePerCap'] + "</strong></p>")
        .style("left", (d3.event.pageX + 15) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition()
        .duration(250)
        tooltip.style("opacity", "0");
      });

  // visualize routes
  var pathsGeo = topojson.feature(pathShapes, pathShapes.objects.routes);
  svg.append("g")
      .attr("class", "lines")
    .selectAll("path")
      .data(pathsGeo.features)
    .enter().append("path")
      .attr("d", path)
      .attr("stroke-width", "1px")
      .attr("fill", "none")
      .attr("stroke", function (d) {
          color = pathColors["colors"][d.properties.lines[0]];
          if (color)
            return pathColors["colors"][d.properties.lines[0]];
          else
            return "#040404";
      });

})
.catch( function (error) {
  console.log(error);
});