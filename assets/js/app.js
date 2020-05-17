var cityMap = Vue.component('city-map', {
	props: ['city'],
	template: `
		<div id="map">
			<svg width="400" height="400"></svg>
		</div>
	`,
	data() {
		return {
			cityData: {
				'New York City': {
					domainMin: 2440,
    			domainMax: 254204,
    			cityShapes: './data/nyc/nyc.json',
    			pathShapes: './data/nyc/nyc_metro_paths.json',
    			pathColors: './data/nyc/nyc_metro_colors.json',
    			censusData: './data/nyc/nyc_census.csv'
				},
				'Philadelphia': {
					domainMin: 11000,
    			domainMax: 160000,
    			cityShapes: './data/philly/philly.json',
    			pathShapes: './data/philly/septa_paths.json',
    			pathColors: '',
    			censusData: ''
				},
				'Boston': {
					domainMin: 1000,
    			domainMax: 200000,
    			cityShapes: './data/boston/boston.json',
    			pathShapes: './data/boston/routes.json',
    			pathColors: './data/boston/routes_colors.json',
    			censusData: ''
				},
				'Los Angeles': {
					domainMin: 1000,
    			domainMax: 300000,
    			cityShapes: './data/la/la.json',
    			pathShapes: './data/la/routes.json',
    			pathColors: '',
    			censusData: ''
				}
			}
		}
	},
	mounted: function() {
		var vm = this;

		var width = 600,
		    height = 500;
		var colorLight = "#f7fbff",
		    colorDark = "#08306b";
		var domainMin = this.cityData[this.city].domainMin,
		    domainMax = this.cityData[this.city].domainMax

		// Fix color
		var color = d3.scaleSqrt()
		  .domain([domainMin, domainMax])
		  .range([colorLight, colorDark]);

		// Create a unit projection and path generator
		var projection = d3.geoAlbersUsa();
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
		    d3.json(this.cityData[this.city].cityShapes),
		    d3.json(this.cityData[this.city].pathShapes),
		    d3.json(this.cityData[this.city].pathColors),
		    d3.csv(this.cityData[this.city].censusData)
		  ]

		const reflect = p => p.then(v => ({v, status: "fulfilled" }),
                            		e => ({e, status: "rejected" }));

		myPromises = Promise.all(promises.map(reflect));
		myPromises.then(function (data) {
		  cityShapes = data[0].v;
		  pathShapes = data[1].v;
		  if (data[2].status == 'fulfilled') {pathColors = data[2].v;}
		  if (data[3].status == 'fulfilled') {censusData = data[3].v;}

		  if (censusData) {
		  	dataById = d3.nest()
			    .key(function(d) { return d.CensusTract; })
			    .rollup(function(d) { return d[0]; })
			    .map(censusData);
		  }

			var medIncome = function (d) {
				if (dataById && vm.city == 'New York City')
	    		return dataById["$" + d.properties.geoid]['IncomePerCap'];
	    	else if (vm.city == 'Boston')
	    		return d.properties['2017 median income'];
	    	else if (vm.city == 'Los Angeles')
	    		return d.properties['Income_Pct'];
	    	else
	    		return d.properties.income;
	    }

	    var censusTractName = function (d) {
	    	if (vm.city == 'New York City')
	    		return dataById["$" + d.properties.geoid]['CensusTract'];
	    	else if (vm.city == 'Boston')
	    		return d.properties['Name'];
	    	else if (vm.city == 'Los Angeles')
	    		return d.properties['TRACTCE10'];
	    	else
	    		return d.properties.name;
	    }

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
		        try {
		        	return color(medIncome(d));
		        }
		        catch (e) { return colorLight; }
		      })
		      .on("mouseover", function (d) {
		        tooltip.transition()
		        .duration(250)
		        tooltip.style("opacity", "1");
		        tooltip.html("<p><strong>" + censusTractName(d) + "</strong> </br> Median Income: $" + parseInt(medIncome(d)).toLocaleString('en') + "</p>")
		        .style("left", (d3.event.pageX + 15) + "px")
		        .style("top", (d3.event.pageY - 28) + "px");
		      })
		      .on("mouseout", function () {
		        tooltip.transition()
		        .duration(250)
		        tooltip.style("opacity", "0");
		      });

		  // visualize routes
		  if (vm.city == 'Philadelphia' || vm.city == 'Los Angeles') {
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
			}
		  else {
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
			      	if (pathColors) {
			      		line_id = vm.city == 'New York City' ? d.properties.lines[0] : d.properties.id;
			      		color = pathColors["colors"][line_id];
			      		return color ? color : "#040404";
			      	}
			      	else { return "#040404"; }
			      });
		  }
		})
		.catch( function (error) {
		  console.log(error);
		});
	}
})

Vue.component('city-tabs', {
	template: `
		<div>
			<div>
				<h2>Cities</h2>
				<ul class="cities-list">
					<li v-for="city in cities"
							v-bind:class="{ activeCity: selectedCity == city }"
							@click="selectedCity = city; forceRerender()">
						{{ city }} </li>
				</ul>
			</div>

			<city-map class="city-map" v-bind:city="selectedCity" :key="componentKey"></city-map>
		</div>
	`,
	data() {
		return {
			cities: ['New York City', 'Boston', 'Philadelphia', 'Los Angeles'],
			selectedCity: 'New York City', // set from @click
			componentKey: 0,
		}
	},
	methods: {
		forceRerender() {
			this.componentKey += 1;
		}
	}
})

var app = new Vue({
  el: '#app',
  data: {
    title: 'How do transportation networks affect wealth distribution in major cities?',
    byline: 'AN EXPLORATION, BY <a href="https://github.com/nnaliu">@NNALIU</a>',
    description: 'I’m fascinated by how our cities’ transportation networks affect the way we live. Many transportation networks are more than 50 years old, but they continue to affect the way our cities develop, where people choose to live, and influence our quality of life. In fact, commuting time has emerged as the single strongest factor in the odds of escaping poverty (<a href=https://www.nytimes.com/2015/05/07/upshot/transportation-emerges-as-crucial-to-escaping-poverty.html>NYT 2015</a>). This project is inspirerd by a paragraph in Professor Edward Glaeser’s book, <a href="https://www.amazon.com/Triumph-City-Greatest-Invention-Healthier/dp/0143120549">Triumph of the City: How Our Greatest Invention Makes Us Richer, Smarter, Greener, Healthier, and Happier</a>.',
    quote: 'The fight against the terrible segregation that remains in American cities is so difficult, in part, because there are economic forces that pull the rich and poor apart... All forms of travel involve two types of cost: money and time... When a single transportation mode, like driving or taking the subway, dominates, then the rich live closer to the city center and the poor live farther away. But when there are multiple modes of transit, then the poor often live closer. New York, Boston, and Philadelphia have four transit and income zones: an inner zone where the rich commute by foot or publico transit, a second zone where the poor commute by public transit, a third zone where the rich drive, and an outer zone comprising distant areas where less wealthy people live and drive... Newer cities, like Los Angeles, are far less oriented toward public transit and as a result have no inner walking or public-transit zone used by the wealthy. The prosperous all drive, and there are just three zones: an inner area where the poor take public transit, a middle area where the rich drive, and an outer area where the less wealthy have horrendous commutes.',
		quoteStyleObject: {
			overflow: 'hidden',
			// maxHeight: '200px'
		},
		readMoreStyleObject: {
			visibility: 'visible'
		},
		references: 'Income data was gathered from the US Census, while route information came from city websites. See full list of data sources here. This project was inspired partially by <a href="https://dangrover.github.io/sf-transit-inequality/">Dan Grover and Mike Belfrage\'s project</a>.'
	},
	methods: {
		showQuote: function () {
			this.quoteStyleObject.overflow = 'visible';
			this.quoteStyleObject.maxHeight = '120px';
			this.readMoreStyleObject.visibility = 'hidden';
		}
	}
});