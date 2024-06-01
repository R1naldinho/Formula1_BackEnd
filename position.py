import requests
import zlib
import base64
import json
import sys
from bs4 import BeautifulSoup


if len(sys.argv) > 2:
  path = sys.argv[1]
  filename = sys.argv[2]
else:
  print("Please provide a path as a command line argument.")
  sys.exit(1)

url = 'https://livetiming.formula1.com/static/' + path + 'Position.z.jsonStream'



def fetch_data(url):
  """Fetches data from the provided URL and decodes it.

  Args:
      url: The URL to fetch data from.

  Returns:
      The decoded data as a string.
  """
  response = requests.get(url)
  content = response.content.decode('utf-8')
  return content

def array_to_text(content):
  """Decodes and decompresses the content.

  Args:
      content: The compressed and encoded data as a byte string.

  Returns:
      The decompressed and decoded data as a string.
  """
  decoded_content = base64.b64decode(content)
  decompressed_content = zlib.decompress(decoded_content, -zlib.MAX_WBITS)
  return decompressed_content.decode('utf-8-sig')

def parse_data(input_data):
  result = []
  lines = input_data.split('\n')

  for line in lines:
    if not line:
      continue

    time = line[:12]
    data_string = array_to_text(line[13:-1])
    result.append({"time": time, "data": json.loads(data_string)})

  return result

def write_to_json(data):
  with open(filename, 'w') as f:
    json.dump(data, f, indent=2)  

parsed_data = parse_data(fetch_data(url))

write_to_json(parsed_data)

print(f"Data written to " + filename + "")
