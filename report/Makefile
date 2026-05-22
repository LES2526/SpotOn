MAIN = main
LATEX = pdflatex
LATEXFLAGS = -interaction=nonstopmode -halt-on-error

.PHONY: all clean

all: $(MAIN).pdf

$(MAIN).pdf: $(MAIN).tex
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex

clean:
	rm -f $(MAIN).pdf $(MAIN).aux $(MAIN).log $(MAIN).out $(MAIN).toc \
		$(MAIN).lof $(MAIN).lot $(MAIN).fls $(MAIN).fdb_latexmk \
		$(MAIN).synctex.gz
