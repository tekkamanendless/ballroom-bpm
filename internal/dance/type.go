package dance

type Dance struct {
	Name    string   `json:"name"`
	Style   string   `json:"style"`
	Timing  uint     `json:"timing"`
	MinBPM  uint     `json:"min"`
	MaxBPM  uint     `json:"max"`
	Sources []string `json:"sources"`
}

type DanceFile struct {
	Dances []Dance `json:"dances"`
}
