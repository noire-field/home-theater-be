export enum LogCategory {
    Action = 'Action',
}
  
export enum LogType {
    // Action
    Auth = 'Auth',
    Series = 'Series',
    Season = 'Season',
    Episode = 'Episode',
    File = 'File'
}

export enum LogAction {
    // Action/Auth
    Login = 'Login',
    Create = 'Create',
    Edit = 'Edit',
    Delete = 'Delete',
    AutoDelete = 'AutoDelete',
    AutoDeleteFilePackage = 'AutoDeleteFilePackage',
    Upload = 'Upload',
    AssignFileToEpisode = 'AssignFileToEpisode',
    RequestZip = 'RequestZip',
    ZipPackingStarted = 'ZipPackingStarted',
    ZipPackingCompleted = 'ZipPackingCompleted',
    ZipPackingFailed = 'ZipPackingFailed',
    RequestFilePackage = 'RequestFilePackage',
    DeleteFilePackage = 'DeleteFilePackage'
}