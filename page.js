let globalData = null;

async function onPageLoaded() {
	let response = await fetch('data.json');
	let data = await response.json();
	console.log("data:", data);

	globalData = data;
	handleFilter();
}

function handleFilter() {
	let processedData = processData(globalData);
	console.log("processedData:", processedData);
	renderChart(document.querySelector('#chart'), processedData);
}

function queryFilters() {
	if (!document.querySelector('#chart .filter')) {
		return null;
	}

	let filters = {
		danceStyles: [],
	};

	let inputs = document.querySelectorAll('#chart .filter input[type="checkbox"][name="style"]:checked');
	for (let input of inputs) {
		filters.danceStyles.push(input.value);
	}

	return filters;
}

function processData(data) {
	let filters = queryFilters();
	console.log("filters:", filters);

	let processedData = {
		dances: [],
		danceNames: [],
		danceStyles: [],
		filteredStyles: [],
		minimumBpm: 0,
		maximumBpm: 0,
	};

	let danceMap = {};
	let styleMap = {};
	for (let dance of data.dances) {
		if (!dance.min || !dance.max) {
			continue;
		}

		danceMap[dance.name] = dance.name;
		styleMap[dance.style] = dance.style;

		if (filters && !filters.danceStyles.includes(dance.style)) {
			continue;
		}

		if (processedData.minimumBpm === 0 || dance.min < processedData.minimumBpm) {
			processedData.minimumBpm = dance.min;
		}
		if (processedData.maximumBpm === 0 || dance.max > processedData.maximumBpm) {
			processedData.maximumBpm = dance.max;
		}

		processedData.dances.push(dance);
	}

	for (let key in danceMap) {
		processedData.danceNames.push(key);
	}
	processedData.danceNames.sort();

	for (let key in styleMap) {
		processedData.danceStyles.push(key);
	}
	processedData.danceStyles.sort();

	if (filters === null) {
		processedData.filteredStyles = processedData.danceStyles;
	} else {
		processedData.filteredStyles = filters.danceStyles;
	}

	processedData.dances.sort((left, right) => {
		let diff = left.min - right.min;
		if (diff != 0) {
			return diff;
		}
		diff = left.max - right.max;
		return diff;
	})

	return processedData;
}

function renderChart(chartElement, data) {
	chartElement.innerHTML = "";

	{
		let fieldset = document.createElement("fieldset");
		fieldset.className = "filter";

		let legend = document.createElement("legend");
		legend.appendChild(document.createTextNode("Filter"));
		fieldset.appendChild(legend);

		{
			let danceContainer = document.createElement("div");

			for (let style of data.danceStyles) {
				let label = document.createElement("label");
				label.dataset.style = style;

				let checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.value = style;
				checkbox.checked = data.filteredStyles.includes(style);
				checkbox.name = "style";
				checkbox.addEventListener("change", () => {
					handleFilter();
				});
				label.appendChild(checkbox);
				label.appendChild(document.createTextNode(style));
				danceContainer.appendChild(label);
			}

			fieldset.appendChild(danceContainer);
		}

		chartElement.appendChild(fieldset);
	}

	{
		let container = document.createElement("div");
		container.className = "dances";

		for (let dance of data.dances) {
			let row = document.createElement('div');
			row.className = "row";

			row.style.marginLeft = ((dance.min - data.minimumBpm) / (data.maximumBpm - data.minimumBpm) * 100) + "%";
			row.style.width = ((dance.max - dance.min) / (data.maximumBpm - data.minimumBpm) * 100) + "%";
			row.style.maxWidth = ((dance.max - dance.min) / (data.maximumBpm - data.minimumBpm) * 100) + "%";

			row.title = dance.name;
			if (dance.style) {
				row.title += " (" + dance.style + ")";
			}
			row.title += " - " + dance.min + "-" + dance.max + "bpm";

			row.dataset.name = dance.name;
			row.dataset.style = dance.style;
			row.dataset.timing = dance.timing;
			row.dataset.min = dance.min;
			row.dataset.max = dance.max;

			row.appendChild(document.createTextNode(dance.name));

			container.appendChild(row);
		}
		chartElement.appendChild(container);
	}
}
