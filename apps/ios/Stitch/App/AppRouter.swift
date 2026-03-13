import SwiftUI

enum Route: Hashable {
    case projectDetail(id: String)
    case counter(sectionId: String)
    case patternDetail(id: String)
    case profile(username: String)
    case findFriends
    case notifications
    case postDetail(id: String)
    case stash
    case needles
    case queue
    case addFromCatalog
    case toolSetDetail(id: String)
    case aiToolLookup
    case stashItemDetail(id: String)
    case patternFolder(id: String, name: String)
    case ravelryPatternDetail(ravelryId: Int, name: String, photoUrl: String?)
}

@Observable
final class AppRouter {
    var path = NavigationPath()

    func push(_ route: Route) {
        path.append(route)
    }

    func pop() {
        path.removeLast()
    }

    func popToRoot() {
        path.removeLast(path.count)
    }
}
