@echo off
echo Testing NDIS API...
cd /d "%~dp0"
call venv\Scripts\activate
python -c "
import requests
try:
    response = requests.get('http://localhost:8000/api/v1/dynamic-data-status', timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(' API is working!')
        print(f'   Data types: {data[\"summary\"][\"total_data_types\"]}')
        print(f'   Data points: {data[\"summary\"][\"total_data_points\"]}')
    else:
        print(' API returned error:', response.status_code)
except requests.exceptions.ConnectionError:
    print(' Cannot connect to API. Is the server running?')
except Exception as e:
    print(' Error:', e)
"
pause
