def paginate_params(page: int, page_size: int) -> tuple[int, int]:
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    offset = (page - 1) * page_size
    return offset, page_size
