# backend/app/services/recurrence_service.py
from datetime import date, timedelta
from typing import Iterable, List, Tuple

# weekday: Monday=0 .. Sunday=6

def generate_daily(start: date, end: date, interval: int) -> List[date]:
    cur = start
    out = []
    while cur <= end:
        out.append(cur)
        cur = cur + timedelta(days=interval)
    return out

def generate_weekly(start: date, end: date, interval: int, by_weekdays: List[int]) -> List[date]:
    out = []
    # align to start week's Monday
    cur = start
    while cur <= end:
        week_start = cur - timedelta(days=cur.weekday())
        for wd in sorted(set(by_weekdays or [])):
            d = week_start + timedelta(days=wd)
            if d >= start and d <= end:
                out.append(d)
        cur = cur + timedelta(weeks=interval)
    return sorted(set(out))

def nth_weekday_of_month(year: int, month: int, weekday: int, n: int) -> date:
    # n=1..5, weekday=0..6
    from calendar import monthrange
    first = date(year, month, 1)
    first_wd = first.weekday()
    delta = (weekday - first_wd) % 7
    first_occurrence = first + timedelta(days=delta)
    target = first_occurrence + timedelta(weeks=n-1)
    # validate same month
    if target.month != month:
        raise ValueError("No such occurrence in month")
    return target

def generate_monthly(start: date, end: date, interval: int, by_monthday: int | None,
                     by_setpos: int | None, by_weekday: int | None) -> List[date]:
    out = []
    y, m = start.year, start.month
    cur = date(y, m, 1)
    while cur <= end.replace(day=1):
        if by_monthday:
            try:
                d = date(cur.year, cur.month, by_monthday)
                if d >= start and d <= end:
                    out.append(d)
            except ValueError:
                pass
        elif by_setpos and by_weekday is not None:
            try:
                d = nth_weekday_of_month(cur.year, cur.month, by_weekday, by_setpos)
                if d >= start and d <= end:
                    out.append(d)
            except Exception:
                pass
        # next month by interval
        nm = cur.month + interval
        ny = cur.year + (nm - 1) // 12
        nm = ((nm - 1) % 12) + 1
        cur = date(ny, nm, 1)
    return sorted(out)
