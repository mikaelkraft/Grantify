# Admin Panel User Guide

## Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. Log in with your admin credentials
3. You'll see tabs for different management areas

## Managing Advertisement Codes

### How to Add/Edit Ad Codes

1. Click on the **"Ads"** tab in the admin panel
2. You'll see 5 text areas for different ad positions:
   - **HEAD Code** - Scripts that load in the `<head>` (e.g., Google AdSense, Analytics)
   - **HEADER Code** - Banner ads at the top of pages (typically 728x90)
   - **BODY Code** - In-content ads within the main content area
   - **SIDEBAR Code** - Sidebar ads (typically 300x250)
   - **FOOTER Code** - Banner ads at the bottom of pages

3. Paste your ad code directly into the appropriate text area
4. Click the **"Save Changes"** button at the top right
5. You'll see a confirmation message when saved successfully

### Example Ad Codes

**For Google AdSense (HEAD section):**
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

**For Banner Ads (HEADER/BODY/FOOTER):**
```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="YYYYYYYYYY"
     data-ad-format="auto"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

**For Propeller Ads:**
```html
<script type="text/javascript">
    atOptions = {
        'key' : 'YOUR_ZONE_KEY',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728
    };
</script>
<script type="text/javascript" src="//www.topcreativeformat.com/YOUR_ZONE_ID/invoke.js"></script>
```

## Managing Testimonials

### Approving User-Submitted Testimonials

1. Click on the **"Testimonials"** tab
2. Pending submissions appear at the top in a yellow box
3. Review each submission and click:
   - **"Approve"** to make it visible on the site
   - **"Reject"** to delete it

### Editing Existing Testimonials

1. Scroll down to see all approved testimonials
2. Edit any field directly:
   - Name
   - Amount Received
   - Date
   - Testimonial Content
   - Avatar Image URL

3. The save indicator will show "You have unsaved changes"
4. Click **"Save Changes"** at the top right to sync to the database

**Note:** All changes are now properly saved to the database, including images and dates (fixed in commit 55ef1e9).

### Adding New Testimonials

1. Click the **"+ Add Testimonial"** button
2. A new testimonial entry will appear with default values
3. Edit all fields as needed
4. Click **"Save Changes"** to persist to the database

## Troubleshooting

### Ads Not Showing After Save
- Clear your browser cache and reload the page
- Check browser console for errors (press F12)
- Verify ad blocker is disabled
- Ensure ad code is valid HTML/JavaScript

### Testimonials Not Syncing
- Make sure you clicked "Save Changes" after editing
- Check the browser console for API errors
- Verify you're connected to the internet
- The fix in commit 55ef1e9 ensures all fields now sync properly

### Changes Not Persisting
- Ensure you have a stable internet connection
- Check if you're connected to the database (Neon PostgreSQL)
- Look for error messages in the admin panel

## Tips

- **Test in Incognito Mode** - After adding ads, test in incognito to ensure they load for new visitors
- **Save Frequently** - Click "Save Changes" after making edits to avoid losing work
- **Backup Your Codes** - Keep a copy of your ad codes in a text file for easy recovery
- **Monitor Performance** - Check ad network dashboards to verify impressions are being tracked

## Support

For detailed ad configuration instructions, see [AD_CONFIGURATION.md](./AD_CONFIGURATION.md)

For technical implementation details, see [FIX_SUMMARY.md](./FIX_SUMMARY.md)
