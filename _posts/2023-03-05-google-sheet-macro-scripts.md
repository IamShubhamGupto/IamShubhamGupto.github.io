---
layout: post
title: Google Sheets macro-scripts
date: 2023-03-05 00:00:00
description: Automatic notifications for Google sheet changes
tags: code apps-script google-sheets automation
categories: code automation 
---

Today's post is about how my flatmates and I use google sheets to track regular house chores and how my coding skills simplifies this process slightly more. At this point, it may seem like I like to blog exclusively about automation of simple tasks but I actually do have more interests!!🤡

## The Problem
Nobody likes to get their hands dirty and take out the trash, fill the dishwasher with the dirty dishes or even has the time to periodically clean the whole house. Atleast this describes us in a single sentence. Before tracking chores on the sheet, we would do these tasks randomly and nobody could actually account for their actions. It would be seem like we were responsible for ourselves and others when the responsibility should be fairly distributed.

## The Solution
We agreed to use Google Sheets to track all the household tasks. We would do these tasks in a cyclic order and then fill in details such as `date` and `cleaned by` on sheet. This solved the ambiguity of who is supposed to clear the trash or empty the dishwasher and we had a smooth system for the remaining semester. However, this system did not carry over to our current semester.

## The Problem : part 2
The three of us this semester have more demanding and polar schedules resulting in us catching up just once every week compared to almost everyday during the previous semester. A bigger side effect of such schedules is we miss checking the sheet for our turn or complete the task and then forget to update the sheet. This results in the trash overflowing again and the sink packed with dirty dishes.

## The REAL solution
This is where I come in. A couple of weeks back one of my flatmates came up with the idea of setting reminders based on who last edited the google sheet. Having very little time to investigate, the idea was soon dropped and made no progress. 

Recently, I have been doing my tasks in a timely manner but I keep forgetting to update the sheet, resulting in the next flatmate to think its still my turn. To address this problem, I brought back the reminder idea based on the google sheet using <a href='https://developers.google.com/apps-script'>Apps Script</a>.

### Pseudo code
```javascript
function clearDishwasher(event)
{
    current_sheet = getCurrentSheet();
    current_range = current_sheet.getCurrentRange();
    current_column = current_range.getColumn();
    // emptied by is in column 3
    if ( current_column == 3 )
    {
        name = current_sheet.getRange(sheet.getLastRow(), current_column).getValue();
        if (name == 'name1' )
        {
            MailApp.sendEmail(
                {
                    to: "email1@haha.com",
                    subject: "Time to Clear Dishwasher!!!",
                    body: "Hi name1, this is an automated mail to inform you that name3 has cleared the dishwasher, its your turn next!!"
                }
            );
        } else if (name == 'name2' )
        {
            MailApp.sendEmail(
                {
                    to: "email2@haha.com",
                    subject: "Time to Clear Dishwasher!!!",
                    body: "Hi name2, this is an automated mail to inform you that name1 has cleared the dishwasher, its your turn next!!"
                }
            );
        } else 
        {
            MailApp.sendEmail(
                {
                    to: "email3@haha.com",
                    subject: "Time to Clear Dishwasher!!!",
                    body: "Hi name3, this is an automated mail to inform you that name2 has cleared the dishwasher, its your turn next!!"
                }
            );
        }
    }
}
```
### Triggers
Coding it was not so bad. Especially now that we have ChatGPT 🌚. However, we need to tell sheets when to run our script otherwise its back to manually running the notifications again. For this, under the **Triggers** tab on the left of the Apps Script page, we specify when the function is to be executed. Here are my settings:
```
Function to run: clearDishwasher,
Which runs at deployment: Head,
Select event source: From spreadsheet,
Select event type: On change,
```

The above settings basically tells google sheet to call `clearDishwasher` whenever there is a change in the spreadsheet. 

## Conclusion

We now have a system that tracks who has completed which household task and also give us reminders when its our turn to do the task. Since the reminder system was just added, we still need to use it and see how viable it is. The entire script can be found here <a href='https://github.com/IamShubhamGupto/Apps-script'> Apps Script </a>.




