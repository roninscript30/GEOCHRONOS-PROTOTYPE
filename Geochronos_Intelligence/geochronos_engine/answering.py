from __future__ import annotations

import json

from .interfaces import QueryInterpreter
from .models import AnalysisResult, CompleteAnalysisResponse, StructuredQuery


def generate_answer(
    query: str,
    analysis_result: AnalysisResult,
    *,
    client: QueryInterpreter | None = None,
) -> str:
    prompt = json.dumps({"query": query, "analysis_result": analysis_result.to_dict()}, sort_keys=True)
    if client is not None:
        return client.generate_answer(prompt)
    if not analysis_result.results:
        return f"No grounded result could be produced for: {query}"
    first = analysis_result.results[0]
    return (
        f"{first.feature_class.title()} {first.status.replace('_', ' ')} between {first.from_year} and {first.to_year}. "
        f"Evidence is grounded in {len(analysis_result.results)} resolved result(s)."
    )


def build_complete_response(
    query: str,
    structured_query: StructuredQuery,
    analysis_result: AnalysisResult,
    *,
    client: QueryInterpreter | None = None,
) -> CompleteAnalysisResponse:
    answer = generate_answer(query, analysis_result, client=client)
    return CompleteAnalysisResponse(
        query=query,
        structured_query=structured_query,
        analysis_result=analysis_result,
        answer=answer,
    )
