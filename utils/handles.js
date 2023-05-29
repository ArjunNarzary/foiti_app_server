


exports.formatTiming = (weekday_text) => {
    let arr = new Array(7).fill(null);
    let insertTiming = true;
    for (day of weekday_text) {
        let dayArr = day.split(": ");
        if (!dayArr.length === 2) {
            insertTiming = false;
            break;
        }
        const time = getTime(dayArr[1]);
        if (!time) {
            insertTiming = false;
            break;
        }

        switch (dayArr[0]) {
            case "Sunday":
                arr[0] = time;
                break;
            case "Monday":
                arr[1] = time;
                break;
            case "Tuesday":
                arr[2] = time;
                break;
            case "Wednesday":
                arr[3] = time;
                break;
            case "Thursday":
                arr[4] = time;
                break;
            case "Friday":
                arr[5] = time;
                break;
            case "Saturday":
                arr[6] = time;
                break;
            default:
                insertTiming = false;
                break;
        }
    }

    if (insertTiming){
        return arr;
    }else{
        insertTiming;
    }
}




const convertTime12to24 = (time12h) => {
    const [time, modifier] = time12h.split(' ');

    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }

    if (modifier === 'PM' || modifier === undefined) {
        hours = parseInt(hours, 10) + 12;
    }

    let timeNumber = `${hours}${minutes}`;
    if(timeNumber.length === 2){
        return `${hours}${minutes}00`;
    } else if (timeNumber.length === 3){
        return `${hours}${minutes}0`;
    }else{
        return `${hours}${minutes}`;
    }

}




const getTime = (timeRange) => {
    if (timeRange === "Closed") {
        return {
            open: null,
            close: null
        }
    } else if (timeRange === "Open 24 hours") {
        return {
            open: "0000",
            close: "2400"
        }
    } else {
        const splitRangeTime = timeRange.split(" – ");
        if (splitRangeTime.length > 1) {
            return {
                open: convertTime12to24(splitRangeTime[0]),
                close: convertTime12to24(splitRangeTime[1])
            }
        } else {
            return false
        }
    }
}

exports.calculateMeetupPoints = (bio = undefined, 
                                meetupReason = undefined, 
                                gender = undefined, 
                                dob = undefined, 
                                address = undefined, 
                                profile = undefined, 
                                interest = undefined, 
                                movies = undefined, 
                                languages = [], 
                                occupation = undefined,
                                education = undefined 
                                ) => 
        {
            let totalPoint = 0;
            if(bio){
                if(bio.length > 10 && bio.length <= 50){
                    totalPoint += 5;
                }else if(bio.length > 50){
                    totalPoint += 10
                }
            }

            if(meetupReason){
                if (meetupReason.length > 10 && meetupReason.length <= 50) {
                    totalPoint += 5;
                } else if (meetupReason.length > 50) {
                    totalPoint += 10;
                }
            }

            if (gender){
                totalPoint += 5;
            }
            if(dob){
                totalPoint += 5;
            }
            if(address){
                totalPoint += 5;
            }
            if(profile){
                totalPoint += 10;
            }

            if (interest) {
                if (interest.length > 10 && interest.length <= 50) {
                    totalPoint += 5;
                } else if (interest.length > 50) {
                    totalPoint += 10
                }
            }

            if (movies) {
                if (movies.length > 10 && movies.length <= 50) {
                    totalPoint += 5;
                } else if (movies.length > 50) {
                    totalPoint += 10
                }
            }

            if (languages.length > 0) {
                totalPoint += 5;
            }
            if (occupation) {
                totalPoint += 5;
            }
            if (education) {
                totalPoint += 5;
            }

            return totalPoint;
        }