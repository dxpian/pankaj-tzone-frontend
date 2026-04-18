export const    USER_ROLE = {
    STD: 0,             // user standard
    SUB: 1,             // sub account
    SUB_QUERY: 2        // sub account. query only
}


// group object
export interface GroupConfig{
    id?: string,
    groupname?: string,
    superior?: string,
    sort: Number,
    remark?: string,
}

export interface Account {
    id: string;             // acount id
    name: string;
    email: string;
    phone?: string;
    condition: string;
    role: Number
    time: string;
    groups?: string[]       // list of group ID
}

