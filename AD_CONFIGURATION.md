# Advertisement Configuration Guide

## Overview
Grantify supports multiple ad placement positions throughout the application. This guide explains how to configure and troubleshoot ad display issues.

## Ad Placement Positions

The application supports 5 different ad positions:

1. **Head** - Scripts that need to be loaded in the `<head>` section (e.g., Google AdSense, Google Tag Manager)
2. **Header** - Banner ads displayed at the top of every page (typically 728x90)
3. **Body** - In-content ads displayed within the main content area
4. **Sidebar** - Sidebar ads displayed on larger screens (typically 300x250)
5. **Footer** - Banner ads displayed at the bottom of every page

## Configuring Ads

### Via Admin Panel

1. Log in to the Admin Panel at `/admin`
2. Navigate to the "Ads" tab
3. Paste your ad code into the appropriate slot fields
4. Click "Save Changes"

### Supported Ad Networks

The application has been optimized to work with:

- **Google AdSense** - Fully supported with automatic initialization
- **Propeller Ads** - Supported for banner, popunder, and other ad formats
- **Direct HTML/JS** - Any custom ad code can be used

## Ad Code Format

### Google AdSense Example

For the **Head** section:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

For ad placement slots (Header, Body, Sidebar, Footer):
```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="YYYYYYYYYY"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

### Propeller Ads Example

For banner ads:
```html
<script type="text/javascript">
    atOptions = {
        'key' : 'YOUR_ZONE_KEY',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
    };
</script>
<script type="text/javascript" src="//www.topcreativeformat.com/YOUR_ZONE_ID/invoke.js"></script>
```

## Troubleshooting

### Ads Not Displaying

**Common causes and solutions:**

1. **Ad Blocker Detected**
   - The app includes ad blocker detection
   - Users will see a warning modal asking them to disable ad blockers
   - Ensure users have disabled ad blocking software

2. **Script Loading Issues**
   - Check browser console for errors
   - Verify ad code is properly formatted
   - Ensure external script URLs are accessible

3. **Timing Issues**
   - The app includes delays to ensure proper script loading
   - AdSlot component waits 100ms before injecting scripts
   - Head scripts wait 200ms after page load

4. **CSP (Content Security Policy) Issues**
   - If using a strict CSP, you may need to whitelist ad network domains
   - Common domains to whitelist:
     - `*.googlesyndication.com`
     - `*.doubleclick.net`
     - `*.propellerads.com`

### Testing Ads Locally

1. Start the development server: `npm run dev`
2. Open browser console to see loading logs
3. Look for messages like:
   - "Injecting head scripts..."
   - "Successfully loaded head script: [URL]"
   - "Loading..." in ad slots

### Viewing Console Logs

The enhanced ad loading system provides detailed console logs:

```
Injecting head scripts...
Injected head script #1
Successfully loaded head script: https://pagead2.googlesyndication.com/...
```

Check the browser console (F12) to monitor ad script loading and identify issues.

## Best Practices

1. **Test on Multiple Browsers**
   - Chrome, Firefox, Safari, and Edge may behave differently
   - Mobile browsers have additional restrictions

2. **Avoid Too Many Ads**
   - Too many ads can slow down page load
   - Follow ad network policies on ad density

3. **Use Recommended Ad Sizes**
   - Header: 728x90 (desktop), 320x50 (mobile)
   - Sidebar: 300x250
   - Footer: 728x90 (desktop), 320x50 (mobile)

4. **Respect User Experience**
   - Don't use intrusive ad formats
   - Ensure ads don't break page layout
   - Test on different screen sizes

## Ad Network Specific Notes

### Google AdSense

- **Auto-initialization**: The AdSlot component automatically calls `adsbygoogle.push({})` for each ad unit
- **Responsive Ads**: Use `data-full-width-responsive="true"` for mobile-friendly ads
- **Policy Compliance**: Ensure your content complies with AdSense policies

### Propeller Ads

- **Zone IDs**: Each ad placement needs a unique zone ID from your Propeller dashboard
- **Multiple Formats**: Supports banner, popunder, interstitial, and native ads
- **Auto-refresh**: Propeller ads typically auto-initialize without extra code

## Support

For ad-related issues:

1. Check browser console for error messages
2. Verify ad code is correctly formatted
3. Test with ad blocker disabled
4. Ensure ad network account is active and approved
5. Review this documentation for configuration examples

## Technical Implementation Details

### Component Architecture

- **AdSlot.tsx**: Handles individual ad placement with async script loading
- **Layout.tsx**: Manages head script injection and overall ad configuration
- **services/storage.ts**: Manages ad configuration storage and API calls

### Script Loading Process

1. Ad configuration loaded from database/localStorage
2. Head scripts injected into `<head>` with 200ms delay
3. Individual AdSlot components load with 100ms delay
4. Scripts loaded sequentially to maintain execution order
5. Error handlers catch and log failed script loads
6. Ad network specific initialization triggers fired

### Error Handling

- Script load failures are logged to console
- Failed ads show "Ad failed to load" message
- Non-blocking errors prevent cascading failures
- Loading states provide user feedback
