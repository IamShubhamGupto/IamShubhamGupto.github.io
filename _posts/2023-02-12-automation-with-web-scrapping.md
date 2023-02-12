---
layout: post
title: Automation with web scrapping
date: 2023-02-12 00:00:00
description: Simplying data collection from web sites using Python web scrapping
tags: code github python web-scrapping
categories: code
---

My work with NYU Marron requires me to automate fence, wall and building annotation on Google Street View images. While this project can be an entire blog separately, I wanted to write specifically about the recent progress I had made. There is a publically available dataset [Cityscapes](https://www.cityscapes-dataset.com) that consists of per-pixel annotations of street videos of 50 cities in and around Germany. While this is not ideal as we are dealing with street view images of New York, it should be a good starting point. Once we establish a baseline on pretrained models from other cities, we could then decide if we need to custom train a model of our own based on the performance.

Since Cityscapes is used a benchmark for lot of the segmentation tasks in Computer Vision, the website also hosts information on methodologies and their performance per class label. This is very interesting as currently, we just need to a model / method that can segment fences, walls and buildings with a good degree of confidence. 

However, scrolling through the entire list just to find the best model for these classes can be very time consuming and requires a lot of effort. What if we could get someone to do this task? Using python modules such as ```bs4.BeautifulSoup``` and ```requests```, we can complete hours of tedious work in a couple of minutes. 

## Workflow
### Read the base site
We first want to download the page of interest and loaded into memory. We achieve this using ```requests``` and parse the content using ```bs4.BeautifulSoup```.
```python
import requests
from bs4 import BeautifulSoup
import pandas as pd

url = "https://www.cityscapes-dataset.com/benchmarks/#scene-labeling-task"

# Make a GET request to fetch the web page
response = requests.get(url)

# Parse the HTML content of the page
soup = BeautifulSoup(response.content, "html.parser")

print(soup)
```
### Parse the site
```BeautifulSoup``` class comes loaded with multiple functions that we will be using to extract useful information very straightforward. We know we are interested in the methods presented in the tabulated format. Hence, we ask BeautifulSoup to fetch all elements and their children that contain the tag ```<tr>```.
```python
# Find the table with the required data
table = soup.find("table", class_="tablepress tablepress-id-2 tablepress-row-details tablepress-responsive")

# Extract the data from the table and store it in a list of dictionaries
data = []
rows = table.find_all("tr")

```
### Search for the keywords you want
We notice that each row only contains generic information that talks about the overall performance and modes used. The real data is hidden away in a hyperlink that goes to the method submission page. Our workflow now would be to:
- Find the model submission link for each method
- Load the contents of the submission page locally
- Filter content of the page based on a few keywords like 'name', 'building', 'fence' etc

This step may take a while depending on the page youre loading. If youre following the blog for the exact same site, the answer is below. Otherwise, I'd recommend to code this section iteratively by looking at the output generated at each step.
```python
data = []
interests = ['name', 'building', 'fence', 'wall', 'vegetation', 'link']
data.append(interests)
for row in rows:
    cols = row.find_all("a", href=True)
    
    detail_links = [x for x in cols if "https://www.cityscapes-dataset.com/method-details/?submissionID=" in x['href']]
    
    for link in detail_links:
        row = []
        detail_response = requests.get(link['href'])
        detail_soup = BeautifulSoup(detail_response.content, "html.parser")
        table_datas = [ i.text.strip() for i in detail_soup.find_all("td")]

        for interest in interests:
            if interest in table_datas:
                 row.append(table_datas[table_datas.index(interest)+1])
        row.append(link['href'])
        data.append(row)
                
print(data)
```

### Format and store data
Now that you have the data you were scouting for, its time to store it in a human presentable format. I use the ```pandas``` library to first convert it into a dataframe and then into an excel spreadsheet. Now further analysis can be carried out using the tools of your choice.

## Conclusion

You just coded a simple web-scrapper using python to collect the data of your interest. I hope the guide was helpful, do reachout to me via mail if you have any ideas for improving my blogging style. This is something I started recently and am working on to improve. The code for this blog should be up on my GitHub hopefully before the next weekend.
