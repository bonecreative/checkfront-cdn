var queryString = queryString || {
    parse(search) {
        const result = {};
        const list = search.substring(1).split("&");
        list.forEach(str => {
            if (str) {
                const identifier = decodeURIComponent(str.split("=")[0]);
                const value = decodeURIComponent(str.split("=")[1]);
                if (identifier) {
                    if (result[identifier]) {
                        // If the identifier already exists, convert the value to an array
                        if (Array.isArray(result[identifier])) {
                            result[identifier].push(value);
                        } else {
                            result[identifier] = [result[identifier], value];
                        }
                    } else {
                        result[identifier] = value;
                    }
                }
            }
        });
        return result;
    }
};

function bookingAppListener(m) {
    try {
        const message = JSON.parse(m.data);
    } catch (e) {
        //console.error(e);
        return;
    }
    if (
        message.type === "response" &&
        message.event === "booking" &&
        message.from === "api"
    ) {
        trackBooking(message.payload.amount, message.payload.code);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    bindEvent(window, "message", bookingAppListener);
});

function bindEvent(element, eventName, eventHandler) {
    if (element.addEventListener) {
        element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
        element.attachEvent("on" + eventName, eventHandler);
    }
}

function trackBooking(amount, booking_id) {
    const trafficSource = JSON.parse(localStorage.getItem("trafficSource"));
    if (!trafficSource) {
        console.error("trafficSource data not found in localStorage");
        return;
    }

    // Use a switch statement to route the tracking to the correct ad provider
    switch (trafficSource.source) {
        case "google":
            // Google Ads conversion tracking
            if (typeof gtag === "function") {
                gtag("event", "conversion", {
                    send_to: GOOGLE_PROPERTY_ID,
                    value: amount,
                    currency: CURRENCY,
                    transaction_id: booking_id
                });
            }
            break;

        case "tiktok":
            // TikTok Ads conversion tracking
            if (typeof ttq === "function") {
                ttq.track("Purchase", {
                    source: trafficSource.source,
                    medium: trafficSource.medium,
                    campaign: trafficSource.campaign,
                    value: amount,
                    order_id: booking_id
                });
            }
            break;

        case "facebook":
            // Facebook Ads conversion tracking
            if (typeof fbq === "function") {
                fbq("track", "Purchase", {
                    source: trafficSource.source,
                    medium: trafficSource.medium,
                    campaign: trafficSource.campaign,
                    value: amount,
                    currency: CURRENCY,
                    content_type: "product",
                    content_ids: [booking_id]
                });
            }
            break;

        default:
            // No conversion tracking available for this traffic source
            console.warn(
                "Conversion tracking not available for traffic source:",
                trafficSource.source
            );
    }
}

function trackTrafficSource() {
    // Parse the query parameters from the URL
    const queryParams = queryString.parse(window.location.search);

    // Detect the traffic source based on the query parameters
    let trafficSource = {};
    if (queryParams.gclid) {
        // Google Ads
        trafficSource = {
            source: "google",
            medium: "cpc",
            campaign: queryParams.gclid
        };
    } else if (queryParams.ttok) {
        // TikTok Ads
        trafficSource = {
            source: "tiktok",
            medium: "cpc",
            campaign: queryParams.ttok
        };
    } else if (queryParams.fbclid) {
        // Facebook Ads
        trafficSource = {
            source: "facebook",
            medium: "cpc",
            campaign: queryParams.fbclid
        };
    }

    // If query parameters are not present, use the stored traffic source information (if available)
    if (
        !trafficSource.source &&
        !trafficSource.medium &&
        !trafficSource.campaign
    ) {
        const storedTrafficSource = JSON.parse(
            localStorage.getItem("trafficSource")
        );
        if (storedTrafficSource) {
            trafficSource = storedTrafficSource;
        }
    }

    // Store the traffic source information in localStorage (if detected)
    if (trafficSource.source && trafficSource.medium && trafficSource.campaign) {
        localStorage.setItem("trafficSource", JSON.stringify(trafficSource));
    }
}

// Call the trackTrafficSource function on page load
window.addEventListener("load", trackTrafficSource);
