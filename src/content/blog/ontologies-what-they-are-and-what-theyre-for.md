---
title: "What an ontology is for"
description: "A working explanation of ontologies through the systems that put them to work: Ontolingua, SHOE, Protégé, Gene Ontology, DBpedia, SNOMED CT and ontology-grounded retrieval."
date: 2026-11-23
tags: ["knowledge", "ontologies", "retrieval"]
---

The word turns up in unexpected places once you start looking: hospital records, genome databases, search engines, and lately the plumbing around language models. The promise behind it is old and plain. Write down what exists in a domain, name the relations between those things, and agree on what the names mean. Different systems can then share a vocabulary and check what they infer from it. The idea predates computing; its current uses run from genome annotation to retrieval around language models. This piece follows the systems that put it to work, from Ontolingua Server in the 1990s to ontology-grounded retrieval in 2025.

## What the word means

In philosophy, ontology is the study of being: what kinds of things exist and how they divide up. Aristotle's categories and Porphyry's third-century tree of concepts are early versions of the same instinct. The word itself is a seventeenth-century coinage, appearing as *ontologia* in Jacob Lorhard's work in 1606 and Rudolf Göckel's lexicon in 1613, with the first recorded English use in Bailey's dictionary of 1721 ([Smith, 2001](http://ontology.buffalo.edu/smith/articles/fois-intro.pdf)).

Computing took the word for a narrower job. In his 1992 posting and 1993 paper, Tom Gruber gave the definition everyone quotes: an ontology is an "explicit specification of a conceptualization", where a conceptualization is "the objects, concepts, and other entities that are presumed to exist in some area of interest and the relationships that hold among them" ([Gruber, 1993](http://www-ksl.stanford.edu/kst/what-is-an-ontology.html)). Studer and colleagues later added formality and sharing, giving "a formal, explicit specification of a shared conceptualization" ([Guarino, Oberle and Staab, 2009](https://iaoa.org/isc2012/docs/Guarino2009_What_is_an_Ontology.pdf)). The extra words matter. A vocabulary a machine cannot process, or one team invented on its own, will not do what Gruber wanted.

An ontology names classes (the kinds of thing), properties (attributes and relations), individuals (the particular things) and axioms that constrain how those terms may be used. The axioms make the difference; Gruber was explicit that an ontology need not be a taxonomy of classes and subsumption relations. A database schema describes how data is arranged in one system. An ontology describes what the data is about, above any single storage format, which is why it can sit between systems that store the same domain differently ([Gruber, 2009](https://tomgruber.org/writing/definition-of-ontology/)).

Turtle, the RDF syntax used to publish many ontologies, makes those constraints visible:

```turtle
@prefix ex:   <https://example.org/papers/> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:Paper a rdfs:Class .
ex:Author a rdfs:Class .
ex:writtenBy a rdf:Property ;
    rdfs:domain ex:Paper ;
    rdfs:range  ex:Author .

ex:thisArticle a ex:Paper ;
    ex:writtenBy ex:Faycal ;
    ex:about ex:Ontologies .
```

![Design showing classes, relations, axioms and individuals in an ontology](/blog/ontologies/design-01-anatomy.svg)

*Original design after the diagram style in Lei et al. (2025). Four kinds of statement in one specification, with a range axiom turning a stored relation into a new fact.*

The `domain` and `range` lines are axioms. A reasoner can use them to infer the type of a subject from its relations, or to flag data whose declared types conflict. A tag list cannot do either.

## Where the idea came from

The computational version grew out of knowledge engineering in the 1980s and early 1990s. A DARPA initiative on knowledge sharing pushed participants towards vocabularies that software systems could commit to, and Gruber's Ontolingua work showed how to encode them in a logic-based language for intelligent programs ([National Academies, 2022](https://www.ncbi.nlm.nih.gov/books/NBK584339)). By 1993 the term was common across artificial intelligence, conceptual modelling and knowledge engineering. Gruber gave the field a credible definition, not the word itself ([Smith, 2001](http://ontology.buffalo.edu/smith/articles/fois-intro.pdf)).

Stanford's Ontolingua Server was the first system to turn that definition into infrastructure. Its authors put a web-based editor over a library of reusable ontologies and opened three routes into it: people browsed and edited through a browser, remote programs queried through a network API, and anyone could translate an ontology into a target representation. T-Helper, a medical expert system, took the second route at run time, asking whether zidovudine is an antiretroviral drug. The server served hundreds of users and let distributed groups work on the same definitions in shared sessions ([Farquhar, Fikes and Rice, 1996](https://ksi.cpsc.ucalgary.ca/KAW/KAW96/farquhar/farquhar.html)).

![Figure 1 from the Ontolingua Server paper: server, translators and remote applications](/blog/ontologies/ontolingua-architecture.png)

*Figure 1 from Farquhar, Fikes and Rice (1996), showing the editor and server, the translators, and remote applications such as T-Helper. [Source](https://courses.cs.umbc.edu/771/papers/KSL-96-26.pdf).*

![A screen image of the Ontolingua browser showing class definitions and their properties](/blog/ontologies/ontolingua-browser.png)

*Figure 3 from the same paper: a screen image of the Ontolingua browsing environment, with a class, its documentation and its links to other terms. [Source](https://courses.cs.umbc.edu/771/papers/KSL-96-26.pdf).*

SHOE, from the University of Maryland, carried the idea onto the open Web a few years later. An ontology was published as a web document. Authors used the Knowledge Annotator, or the Running SHOE wrapper for existing tables and lists, to mark up claims against it. Exposé, a crawler, collected the claims and the ontologies they cited into a knowledge base, where SHOE Search and PIQ answered structured queries. A claim stayed a claim made by a page rather than a fact the system accepted, which mattered on a Web nobody controlled. Storage was interchangeable: XSB offered full inference, a relational database offered scale, and Parka sat between them ([Heflin, Hendler and Luke, 1999](https://www.cs.umd.edu/projects/plus/SHOE/pubs/techrpt99.pdf); [Heflin et al., 2000](https://www.cse.lehigh.edu/~heflin/pubs/aiweb2000.pdf)).

![Figure 1 from the SHOE paper showing the system architecture](/blog/ontologies/shoe-architecture.png)

*Figure 1, "The System Architecture", from Heflin et al. (2000): web pages, user interfaces and the SHOE knowledge base. [Source](https://www.cse.lehigh.edu/~heflin/pubs/aiweb2000.pdf).*

![A screenshot of the SHOE Search interface with category and relation queries](/blog/ontologies/shoe-search.png)

*Figure 3 from the same paper: the SHOE Search interface querying a university ontology. [Source](https://www.cse.lehigh.edu/~heflin/pubs/aiweb2000.pdf).*

Read the dates in order and a pattern appears. Aristotle and Porphyry came first, then the Latin coinage of 1606 and 1613, the AI and DARPA work of the 1980s and 1991, Gruber's 1993 definition, GO in 1998, RDF in 1999, SNOMED CT and OWL in the early 2000s, linked data and knowledge graphs in the 2010s, and ontology-grounded retrieval in 2025. The Web supplied a standard stack: RDF became a W3C recommendation in 1999, OWL in 2004 and OWL 2 in 2012 ([Hitzler, 2021](https://cacm.acm.org/research/a-review-of-the-semantic-web-field)). OWL rests largely on description logics, fragments of first-order logic chosen so that deductive reasoning over them stays decidable. The representations remain expressive enough to say something useful and constrained enough for a machine to draw conclusions.

Hitzler's review divides the field's first two decades into three phases, each with ontology at the centre in a different way: the 2000s were driven by ontologies, the early 2010s by linked data, and the period since by knowledge graphs ([Hitzler, 2021](https://cacm.acm.org/research/a-review-of-the-semantic-web-field)). The biomedical world ran a parallel timeline. SNOP, the Systematized Nomenclature of Pathology, appeared in 1965 and grew into SNOMED CT by 2002 ([Bodenreider, Cornet and Vreeman, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6115234/)). The Gene Ontology Consortium formed in 1998 to give three model-organism databases a shared vocabulary for gene function, published its first paper in 2000, and OBO, the umbrella coordinating biomedical ontologies, started in 2001 ([Smith et al., 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC2814061)). These were ontologies in the full sense, with relations and logic behind the terms, not just word lists.

Ontology building soon acquired a standard method. Noy and McGuinness's *Ontology Development 101*, written for Protégé-2000, sets out seven steps: scope and competency questions, reuse of existing ontologies, enumeration of terms, class hierarchy, properties, facets such as cardinality and domain and range, and finally instances. The authors stress that the work iterates and that no single model of a domain is correct ([Noy and McGuinness, 2001](https://protege.stanford.edu/publications/ontology_development/ontology101-noy-mcguinness.html)).

![A Protégé screenshot showing slots for the class Wine and their facets](/blog/ontologies/protege-slots.png)

*Figure 3 from Noy and McGuinness (2001): the slots for a class and their facets in Protégé-2000. [Source](https://protege.stanford.edu/publications/ontology_development/ontology101-noy-mcguinness.html).*

DBpedia showed the same machinery at Web scale. It extracted infoboxes, categories, abstracts and links from Wikipedia dumps into RDF, loaded the result into a triple store, and exposed it through Linked Data URIs and a SPARQL endpoint. The 2007 paper reports around 103 million RDF triples, 9.1 million of them from 754,000 infoboxes. A browser asking for a URI received HTML; an agent received RDF ([Auer et al., 2007](http://iswc2007.semanticweb.org/papers/715.pdf)).

![Figure 1 from the DBpedia paper showing its components and data flow](/blog/ontologies/dbpedia-architecture.png)

*Figure 1 from Auer et al. (2007): an overview of the DBpedia components, from Wikipedia extraction to SPARQL and Linked Data. [Source](http://iswc2007.semanticweb.org/papers/715.pdf).*

![The DBpedia form-based query builder from the 2007 paper](/blog/ontologies/dbpedia-query-builder.png)

*Figure 6 from the same paper: the form-based query builder, which let users ask without writing SPARQL by hand. [Source](http://iswc2007.semanticweb.org/papers/715.pdf).*

## What having one buys you

Interoperability was the first selling point. Two databases can record the same patient, gene or invoice under different labels. If both annotate their records against a shared ontology, a query written in those terms reaches both. Gruber's encyclopedia entry puts it plainly: ontologies sit at the semantic level, above data models, which is why they integrate heterogeneous databases and specify interfaces between independent services ([Gruber, 2009](https://tomgruber.org/writing/definition-of-ontology/)). A survey of data management describes the day-to-day version: systems facing incomplete or heterogeneous data use an ontology's taxonomies and background knowledge to align and complete what they have ([Schneider and Šimkus, 2020](https://link.springer.com/article/10.1007/s13218-020-00686-3)).

![Design showing two source systems with different local labels sharing one ontology term](/blog/ontologies/design-02-sharing.svg)

*Original design after the diagram style in Lei et al. (2025). Each store keeps its own labels; the ontology supplies the term the query is written in.*

Formal semantics bring more. A reasoner can derive facts that were never stored, check a set of assertions for consistency, and answer a query through relations rather than literal terms. The Gene Ontology shows this at scale. A biocurator reads a paper, chooses the most specific term from molecular function, biological process or cellular component, and records an evidence code and a reference. The annotations travel in GAF files to AmiGO and QuickGO, then into enrichment tools that compare a gene set against a background. Positive annotations propagate upwards; a missing annotation does not make a term false ([GO annotation documentation](https://geneontology.org/docs/go-annotations/); [evidence codes](https://geneontology.org/docs/guide-go-evidence-codes/)).

![A GO-CAM model visualising causal activity relationships between proteins](/blog/ontologies/go-cam-model.png)

*GO-CAM extends GO annotations with biological context and causal links; this model view shows activities and their relationships. [Source](https://geneontology.org/docs/go-annotations/).*

![A GO-CAM pathway model for Vitamin K metabolic process in mouse](/blog/ontologies/go-pathway.png)

*A GO-CAM pathway model for Vitamin K metabolic process, with network nodes and edges. [Source](https://geneontology.org/docs/go-annotations/).*

![Design showing a stored fact and an axiom feeding a reasoner to produce an inferred fact](/blog/ontologies/design-04-reasoning.svg)

*Original design after the diagram style in Lei et al. (2025). The conclusion follows from the axiom and the fact, not from a literal lookup.*

The OBO Foundry turned the GO pattern into rules other ontologies could follow: open, orthogonal, expressed in a well-specified syntax, sharing a common space of identifiers. Orthogonality keeps each ontology within its subject matter, so annotations from different sources add up instead of clashing. Shared identifiers let legacy annotations survive as an ontology changes. Cross-products show the payoff, composing PATO for "increased concentration", FMA for "blood" and ChEBI for "glucose" into a single term ([Smith et al., 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC2814061)).

Search and integration are the visible forms of the same trick. Ontologies provide a shared vocabulary for publishing data and answering queries, including in the Semantic Web stack ([Gruber, 2009](https://tomgruber.org/writing/definition-of-ontology/)). A domain ontology also acts as a contract: a term that does not fit its constraints signals a problem upstream. That is a quieter benefit than inference and often the first one teams notice.

Building one starts with the questions it must answer, called competency questions. They give the ontology a test before anyone writes classes. The GO Consortium set out to support cross-database queries, and that goal determined what went into it ([Genome Research, 2001](http://genome.cshlp.org/content/11/8/1425)). A clinical-study ontology published in 2025 defines nine such questions, translates them into SPARQL and uses them to verify the finished model ([CMEO, 2025](https://link.springer.com/article/10.1186/s12911-025-03272-5)).

![Design showing competency questions leading through classes and axioms to a test and a published ontology](/blog/ontologies/design-03-method.svg)

*Original design after the diagram style in Lei et al. (2025). The question sets the design and becomes the acceptance test; a failed test sends the model back for revision.*

There is a bottom-up route too. An LLM can propose a schema from a corpus or a relational database, which someone then curates and aligns to existing ontologies. A 2025 survey describes both directions: competency-question-driven engineering from the top down, and "data-to-schema" induction where an instance graph comes first and concepts are abstracted from it ([Bian, 2025](https://arxiv.org/html/2510.20345v1)). Mapping tools handle part of the alignment, assembling and inferring links between the identifier spaces different ontologies use ([SeMRA, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12629235)).

## Where they are used now

Biomedicine remains the largest working example. SNOMED CT is a clinical reference terminology with description logic underneath and five decades of versioning behind it ([Bodenreider et al., 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6115234/)). A 2025 study at Geneva University Hospitals describes the problem in a warehouse of more than 150,000 data elements: coders must choose a single concept where possible and use approved post-coordination where they cannot, preserving meaning through semantic equivalence rather than exact matching. By November 2024 they had encoded 97,930 data elements with 41,345 distinct expressions, 18,175 of them post-coordinated ([Ehrsam et al., 2025](https://link.springer.com/article/10.1186/s13326-025-00326-5)).

![Figure from the SNOMED CT study showing exploration of the concept hierarchy to find a precise code](/blog/ontologies/snomed-hierarchy.png)

*Figure 5 from Ehrsam et al. (2025): exploring the SNOMED CT hierarchy to find the appropriate concept. Licensed CC BY-NC-ND 4.0. [Source](https://link.springer.com/article/10.1186/s13326-025-00326-5).*

The annotations are a working system in their own right. QuickGO shows a gene product such as human TP53 beside its GO terms, evidence codes, references and annotation extensions, which turns a claim about function into something a reader can inspect and reuse ([GO Consortium](https://geneontology.org/docs/go-annotations/)).

![QuickGO annotation list for human TP53 with GO terms, evidence codes and references](/blog/ontologies/quickgo-annotations.png)

*QuickGO annotation list for human TP53, captured 24 November 2026: GO terms, evidence codes, PubMed references and annotation extensions. [Source](https://www.ebi.ac.uk/QuickGO/annotations?geneProductId=UniProtKB:P04637).*

At industrial scale, a healthcare data company processing over 100 billion records a year from more than a million feeds uses ontologies in three layers: public standards such as ChEBI, ATC and RxNorm; reference data describing the vocabulary as actually used, including regional product names; and custom last-mile graphs. The resulting knowledge graphs span ontology versions a decade old to assemble longitudinal patient records ([Splendiani et al., 2024](https://ceur-ws.org/Vol-3890/paper-38.pdf)).

![Figure from the IQVIA paper showing examples of ontology assets across resources and domains](/blog/ontologies/iqvia-assets.png)

*Figure 1 from Splendiani et al. (2024): examples of IQVIA ontology assets across healthcare and life-science domains. [Source](https://ceur-ws.org/Vol-3890/paper-38.pdf).*

The query side is equally concrete. A SPARQL query against DBpedia's endpoint can ask for cities above a population threshold and get typed results back, each value carrying its XML Schema datatype.

![DBpedia SPARQL endpoint results for a query over city populations](/blog/ontologies/dbpedia-sparql.png)

*Live results from the DBpedia SPARQL endpoint for a query over `City` and `populationTotal`, captured 24 November 2026. [Source](https://dbpedia.org/sparql).*

Ontologies have also moved into language-model pipelines, mostly to constrain what retrieval brings back. OG-RAG is the clearest worked example. An ontology is written as subject, attribute and value triples, with slots left open for text from documents. An LLM fills the slots and emits self-contained factual blocks in JSON-LD. The blocks are flattened into hypernodes, and each flattened fact becomes a hyperedge. Query time involves no LLM call: embedding similarity selects candidate hypernodes by keys and by values, a greedy minimum-cover step adds the hyperedges covering the most uncovered nodes, and the retrieved facts go to the LLM as a list. On 85 agriculture documents and 149 news articles, across four LLMs, the authors report gains of 55% in fact recall, 40% in correctness and 27% in fact-based reasoning accuracy, with 30% faster context attribution ([Sharma, Kumar and Li, 2025](https://aclanthology.org/2025.emnlp-main.1674.pdf)).

![Figure 2 from the OG-RAG paper showing ontology-to-hypergraph construction and retrieval](/blog/ontologies/ograg-pipeline.png)

*Figure 2 from Sharma, Kumar and Li (2025): the OG-RAG pipeline, from ontology-grounded document mapping to retrieved hyperedges. Licensed CC BY 4.0. [Source](https://aclanthology.org/2025.emnlp-main.1674.pdf).*

![Design showing documents, ontology triples, a fact graph, a retriever and an LLM answer](/blog/ontologies/design-05-retrieval.svg)

*Original design after the diagram style in Lei et al. (2025). The ontology fixes what counts as a fact before retrieval begins; the LLM writes the final answer.*

FrOG applies the same idea to questions over existing knowledge graphs. Simple questions are answered by verbalising one-hop triples and embedding them. Complex ones first retrieve relevant ontology classes and properties from a hybrid index, then ask an LLM to write SPARQL with few-shot examples and chain-of-thought, and run it against the graph. In an ablation, removing ontology retrieval dropped Jaccard similarity on Wikidata from 0.458 to 0.377, on DBpedia from 0.517 to 0.381, and on a small curriculum knowledge graph from 0.805 to 0.183. The authors call it the most critical component ([FrOG, 2025](https://ceur-ws.org/Vol-4020/Paper_ID_7.pdf)).

![Figure 1 from the FrOG paper showing its question-answering pipeline](/blog/ontologies/frag-pipeline.png)

*Figure 1 from FrOG (2025): the pipeline architecture, from entity linking through ontology retrieval to SPARQL execution and answer generation. [Source](https://ceur-ws.org/Vol-4020/Paper_ID_7.pdf).*

A comparison of six strategies on one grant application found that both chunk-enhanced ontology-guided graphs matched Microsoft GraphRAG at 18 of 20 questions, while vector RAG reached 12 of 20 and the same ontology graphs without chunks fell to 3 and 4 of 20 ([da Cruz et al., 2025](https://arxiv.org/html/2511.05991v1)).

The results are promising but not settled. A 2024 scoping review of SNOMED CT in language models found a range of integration approaches and some studies with no improvement or a decline on particular metrics; it points to the lack of standard evaluation as the reason no firm conclusion is possible ([JMIR Medical Informatics, 2024](https://medinform.jmir.org/2024/1/e62924)). Ontologies also carry running costs: version drift, mismatches between standards such as SNOMED CT and HL7 FHIR, and the computational cost of reasoning ([Frontiers in Digital Health, 2025](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1668385/full)). The oldest example makes the same point. SNOMED took five decades of revisions to reach its logic-based form, and each change affected the data annotated against it.

## When it is worth building one

I would reach for an ontology when the same concepts must mean the same thing across more than one system, when reasoning over relations matters more than keyword matching, or when the vocabulary needs to stay stable while the data underneath changes. In those cases the agreement is the asset and the formal encoding makes it enforceable. For a single application with a closed vocabulary, a schema or a well-kept tag list will do with less ceremony. The test I use is the one ontology engineers use: write down the questions first. If you cannot name them, the classes you are about to define have no owner.

## References

1. Gruber, T. R. (1993). *A translation approach to portable ontologies.* Knowledge Acquisition, 5(2), 199–220. http://www-ksl.stanford.edu/kst/what-is-an-ontology.html
2. Gruber, T. (2009). *Ontology.* Encyclopedia of Database Systems. https://tomgruber.org/writing/definition-of-ontology/
3. Guarino, N., Oberle, D. and Staab, S. (2009). *What is an ontology?* Handbook on Ontologies. https://iaoa.org/isc2012/docs/Guarino2009_What_is_an_Ontology.pdf
4. Smith, B. (2001). *Ontology and information systems.* http://ontology.buffalo.edu/smith/articles/fois-intro.pdf
5. Farquhar, A., Fikes, R. and Rice, J. (1996). *Collaborative ontology construction.* https://courses.cs.umbc.edu/771/papers/KSL-96-26.pdf
6. Heflin, J., Hendler, J. and Luke, S. (1999). *SHOE: a knowledge representation language for Internet applications.* https://www.cs.umd.edu/projects/plus/SHOE/pubs/techrpt99.pdf
7. Heflin, J. et al. (2000). *Searching the Web with SHOE.* https://www.cse.lehigh.edu/~heflin/pubs/aiweb2000.pdf
8. Hitzler, P. (2021). *A review of the Semantic Web field.* Communications of the ACM. https://cacm.acm.org/research/a-review-of-the-semantic-web-field
9. Hitzler, P., Lehmann, K. and Polleres, A. (2014). *Foundations of Semantic Web technologies.* https://people.cs.ksu.edu/~hitzler/pub/hhl-sw.pdf
10. Genome Research (2001). *The Gene Ontology: tool for the unification of biology.* http://genome.cshlp.org/content/11/8/1425
11. GO Consortium. *GO annotations* and *guide to evidence codes.* https://geneontology.org/docs/go-annotations/ ; https://geneontology.org/docs/guide-go-evidence-codes/
12. Smith, B. et al. (2007). *The OBO Foundry.* Nature Biotechnology. https://pmc.ncbi.nlm.nih.gov/articles/PMC2814061
13. Bodenreider, O., Cornet, R. and Vreeman, D. J. (2018). *Recent developments in clinical terminologies.* Yearbook of Medical Informatics. https://pmc.ncbi.nlm.nih.gov/articles/PMC6115234/
14. Auer, S. et al. (2007). *DBpedia: a nucleus for a Web of open data.* http://iswc2007.semanticweb.org/papers/715.pdf
15. Schneider, M. and Šimkus, M. (2020). *Ontologies and data management in the era of big data.* https://link.springer.com/article/10.1007/s13218-020-00686-3
16. Noy, N. F. and McGuinness, D. L. (2001). *Ontology Development 101.* https://protege.stanford.edu/publications/ontology_development/ontology101-noy-mcguinness.html
17. Bian, H. et al. (2025). *LLM-empowered knowledge graph construction: a survey.* https://arxiv.org/html/2510.20345v1
18. SeMRA (2025). *Semantic mapping and relationship alignment.* https://pmc.ncbi.nlm.nih.gov/articles/PMC12629235
19. Ehrsam, A. et al. (2025). *Representing clinical data elements with SNOMED CT.* Journal of Biomedical Semantics. https://link.springer.com/article/10.1186/s13326-025-00326-5
20. Splendiani, A. et al. (2024). *Ontology-based data integration at scale.* CEUR Workshop Proceedings, Vol-3890. https://ceur-ws.org/Vol-3890/paper-38.pdf
21. Sharma, K., Kumar, P. and Li, Y. (2025). *OG-RAG: ontology-grounded retrieval-augmented generation.* EMNLP 2025. https://aclanthology.org/2025.emnlp-main.1674.pdf
22. FrOG (2025). *Ontology-guided knowledge graph construction for RAG.* CEUR Workshop Proceedings, Vol-4020. https://ceur-ws.org/Vol-4020/Paper_ID_7.pdf
23. da Cruz, T., Tavares, B. and Belo, F. (2025). *Ontology learning and knowledge graph construction for RAG.* https://arxiv.org/html/2511.05991v1
24. Gilani, S. et al. (2025). *CMEO: a clinical study metadata ontology.* BMC Medical Informatics and Decision Making. https://link.springer.com/article/10.1186/s12911-025-03272-5
25. JMIR Medical Informatics (2024). *SNOMED CT and language models: a scoping review.* https://medinform.jmir.org/2024/1/e62924
26. Frontiers in Digital Health (2025). *Challenges in clinical terminology interoperability.* https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1668385/full
27. Lei, Y., Xu, J., Liang, C. X., Bi, Z., Li, X., Zhang, D., Song, J. and Yu, Z. (2025). *Reasoning in Large Language Models: From Chain-of-Thought to Massively Decomposed Agentic Processes.* Preprints. https://doi.org/10.20944/preprints202512.2242.v1
