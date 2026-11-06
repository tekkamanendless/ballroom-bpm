package dance

import (
	"embed"
	"encoding/json"
	"io/fs"
)

//go:embed embedded/*
var rawEmbeddedFS embed.FS

// embeddedFS is the embedded filesystem for the dance data with the embedded prefix removed.
var embeddedFS, _ = fs.Sub(rawEmbeddedFS, "embedded")

var dances []Dance

func init() {
	file, err := embeddedFS.Open("data.json")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	var danceFile DanceFile
	err = json.NewDecoder(file).Decode(&danceFile)
	if err != nil {
		panic(err)
	}

	dances = danceFile.Dances
}

// Dances returns the list of dances.
func Dances() []Dance {
	return dances
}
