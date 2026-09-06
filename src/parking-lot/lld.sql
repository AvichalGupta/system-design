user vehicle {
    id
    type: 4w/2w
    details: {
        vehicle number
    }
    entry time
    exit time
    parking identifier
}

parking lot {
    id
    name
    total capacity
    owner_details: {
        name,
        email,
        company,
    }
}

floor {
    id
    parking lot id
    total capacity
    available capacity
}

parking slot {
    floor id
    parking identifier
    parking type = reserved/handicap/4w/2w
    parking status = occupied/vacant/maintainance
}

parking type metadata {
    parking type
    hourly rate
    penalties
    total capacity
    available capacity
}

payment {
    id
    user vehicle id
    amount
    penalties
}
